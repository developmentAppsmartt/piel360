import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import type { AnalysisProviderSlug } from '@piel360/shared';
import type { Prisma, Plan } from '@prisma/client';
import { BillingService } from '../billing/billing.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import {
  parsePlanProviderIds,
  planIncludesProviderId,
} from '../plans/plan-providers.util';
import { PlanPoolAvailabilityService } from '../plans/plan-pool-availability.service';
import type { CreateSubscriptionDto } from './dto/create-subscription.dto';
import type { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { syncOrganizationSeatLimitForUser } from '../organizations/org-seat-limit.util';
import {
  assertUserMatchesPlanType,
  loadAdminSubscriptionById,
  serializeAdminSubscription,
  serializeUserSubscription,
} from './subscription-admin.util';
import {
  computeSubscriptionEndsAt,
  resolveSubscriptionEndsAt,
} from './subscription-ends.util';
import { SubscriptionPoolService } from './subscription-pool.service';

type Db = PrismaService | Prisma.TransactionClient;

type PaidSubscription = Prisma.SubscriptionGetPayload<{
  include: { plan: { include: { provider: true } }; user: true };
}>;

const APPROVED_STATUSES = ['APPROVED'];
const CANCELLED_STATUSES = ['DECLINED', 'VOIDED', 'ERROR'];

/**
 * Mínimo necesario para que `AnalysesService.performAnalysis` (MIGRACION.md §4.1)
 * pueda validar y descontar créditos. El checkout/Wompi (referencia, firma de
 * integridad, webhook) es Semana 4 — aquí solo hay creación manual admin,
 * equivalente al "el admin puede activar suscripciones sin pago" de MIGRACION.md §2.4.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly orgContext: OrgContextService,
    private readonly subscriptionPool: SubscriptionPoolService,
    private readonly billing: BillingService,
    @Inject(forwardRef(() => PlanPoolAvailabilityService))
    private readonly planPool: PlanPoolAvailabilityService,
  ) {}

  private readonly adminSubscriptionInclude = {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        doctor: {
          select: {
            empresa: true,
            empresaReferida: true,
            membershipType: true,
          },
        },
        patient: { select: { id: true } },
      },
    },
    plan: { include: { provider: true } },
  } as const;

  private async listAllProviders() {
    return this.prisma.analysisProvider.findMany({ orderBy: { id: 'asc' } });
  }

  async findActiveForUser(
    db: Db,
    userId: bigint,
    providerSlug: AnalysisProviderSlug,
  ) {
    const ctx = await this.orgContext.resolve(userId.toString());
    const billingUserId = ctx.subscriptionUserId;

    const provider = await db.analysisProvider.findUnique({
      where: { slug: providerSlug },
    });
    if (!provider) return null;

    const subscriptions = await db.subscription.findMany({
      where: {
        userId: billingUserId,
        status: 'active',
      },
      include: { plan: { include: { provider: true } } },
      orderBy: { id: 'desc' },
    });

    const now = new Date();
    return (
      subscriptions.find((subscription) => {
        if (!planIncludesProviderId(subscription.plan, provider.id)) {
          return false;
        }
        const endsAt = resolveSubscriptionEndsAt(subscription, subscription.plan);
        return endsAt !== null && endsAt > now;
      }) ?? null
    );
  }

  /**
   * Usuario de facturación para un análisis: el profesional usa el suyo;
   * el paciente usa la suscripción del médico tratante del paciente.
   */
  async resolveBillingUserIdForAnalysis(
    actorUserId: bigint,
    patientId: string,
  ): Promise<bigint> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: actorUserId },
      select: { id: true },
    });
    if (doctor) return actorUserId;

    const patient = await this.prisma.patient.findUnique({
      where: { id: BigInt(patientId) },
      select: {
        userId: true,
        doctor: { select: { userId: true } },
      },
    });
    if (!patient) {
      throw new BadRequestException('Paciente no encontrado');
    }
    if (patient.userId?.toString() !== actorUserId.toString()) {
      throw new ForbiddenException(
        'Solo el paciente dueño de la cuenta o su médico pueden usar este análisis',
      );
    }
    if (!patient.doctor?.userId) {
      throw new BadRequestException(
        'Este paciente no tiene un profesional asignado con plan de análisis',
      );
    }
    return patient.doctor.userId;
  }

  async remainingCredits(
    db: Db,
    subscriptionId: bigint,
    analysisLimit: number,
  ) {
    const usage = await db.subscriptionUsage.aggregate({
      where: { subscriptionId },
      _sum: { quantity: true },
    });
    return analysisLimit - (usage._sum.quantity ?? 0);
  }

  async consumeCredit(db: Db, subscriptionId: bigint, analysisId: bigint) {
    return db.subscriptionUsage.create({
      data: { subscriptionId, analysisId, quantity: 1 },
    });
  }

  private computeEndsAt(plan: { durationDays: number }, from = new Date()) {
    return computeSubscriptionEndsAt(plan, from);
  }

  /** Persiste endsAt en suscripciones activas que aún no lo tienen. */
  private async ensureSubscriptionEndsAt<
    T extends {
      id: bigint;
      endsAt: Date | null;
      status: string;
      createdAt: Date;
      plan: { durationDays: number };
    },
  >(subscription: T, db: Db = this.prisma): Promise<Date | null> {
    if (subscription.endsAt) return subscription.endsAt;
    const resolved = resolveSubscriptionEndsAt(subscription, subscription.plan);
    if (!resolved) return null;
    await db.subscription.update({
      where: { id: subscription.id },
      data: { endsAt: resolved },
    });
    return resolved;
  }

  private async reservePoolForActiveSubscription(
    subscriptionId: bigint,
    plan: Plan,
  ): Promise<void> {
    await this.subscriptionPool.allocateForSubscription(
      this.prisma,
      subscriptionId,
      plan,
    );
  }

  private async cancelOverlappingActive(
    tx: Prisma.TransactionClient,
    userId: bigint,
    newPlan: Plan,
  ) {
    const activeSubs = await tx.subscription.findMany({
      where: { userId, status: 'active' },
      include: { plan: true },
    });
    const newProviderIds = new Set(parsePlanProviderIds(newPlan));
    for (const active of activeSubs) {
      const activeIds = parsePlanProviderIds(active.plan);
      const overlaps = activeIds.some((id) => newProviderIds.has(id));
      if (overlaps) {
        await this.subscriptionPool.returnUnusedCredits(tx, active.id);
        await tx.subscription.update({
          where: { id: active.id },
          data: { status: 'cancelled' },
        });
      }
    }
  }

  /** Creación manual (admin), sin pasar por Wompi — activa por defecto. */
  async createManual(dto: CreateSubscriptionDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: BigInt(dto.planId) },
    });
    if (!plan) throw new BadRequestException('Plan no encontrado');

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(dto.userId) },
      include: {
        doctor: {
          select: {
            empresa: true,
            empresaReferida: true,
            membershipType: true,
          },
        },
        patient: { select: { id: true } },
      },
    });
    if (!user) throw new BadRequestException('Usuario no encontrado');
    assertUserMatchesPlanType(user, plan);

    const status = dto.status === 'cancelled' ? 'cancelled' : 'active';
    const endsAt = this.computeEndsAt(plan);

    if (status === 'active') {
      await this.planPool.assertPlanPurchasable(plan);
    }

    const subscription = await this.prisma.$transaction(async (tx) => {
      if (status === 'active') {
        await this.cancelOverlappingActive(tx, user.id, plan);
      }

      const created = await tx.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status,
          endsAt: status === 'active' ? endsAt : null,
        },
      });

      return created;
    });

    if (subscription.status === 'active') {
      await this.reservePoolForActiveSubscription(subscription.id, plan);
    }

    if (subscription.status === 'active' && plan.planType === 'business') {
      await syncOrganizationSeatLimitForUser(
        this.prisma,
        subscription.userId,
      );
    }

    const providers = await this.listAllProviders();
    return loadAdminSubscriptionById(
      this.prisma,
      subscription.id,
      providers,
    );
  }

  /** `GET /admin/subscriptions` — lista completa para el CRUD admin. `select`
   * explícito en `user` (no `include: true`) para no filtrar el hash de la
   * contraseña, mismo cuidado que en `doctors.service.ts`. */
  async findAllAdmin() {
    const [rows, providers] = await Promise.all([
      this.prisma.subscription.findMany({
        include: this.adminSubscriptionInclude,
        orderBy: { id: 'desc' },
      }),
      this.listAllProviders(),
    ]);

    await Promise.all(
      rows
        .filter((row) => row.status === 'active' && !row.endsAt)
        .map(async (row) => {
          row.endsAt = await this.ensureSubscriptionEndsAt(row);
        }),
    );

    await this.subscriptionPool.syncActiveSubscriptionPools();

    return rows.map((row) => serializeAdminSubscription(row, providers));
  }

  /** Edición manual (admin) — bypass del flujo Wompi, igual que el
   * `SubscriptionForm` del Laravel viejo permitía fijar cualquier campo
   * directamente. */
  async update(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({
      where: { id: BigInt(id) },
      include: {
        plan: true,
        user: {
          include: {
            doctor: {
              select: {
                empresa: true,
                empresaReferida: true,
                membershipType: true,
              },
            },
            patient: { select: { id: true } },
          },
        },
      },
    });
    if (!existing) {
      throw new BadRequestException('Suscripción no encontrada');
    }

    const nextUserId = dto.userId ? BigInt(dto.userId) : existing.userId;
    const nextPlanId = dto.planId ? BigInt(dto.planId) : existing.planId;

    const [nextUser, nextPlan] = await Promise.all([
      nextUserId === existing.userId
        ? Promise.resolve(existing.user)
        : this.prisma.user.findUnique({
            where: { id: nextUserId },
            include: {
              doctor: {
                select: {
                  empresa: true,
                  empresaReferida: true,
                  membershipType: true,
                },
              },
              patient: { select: { id: true } },
            },
          }),
      nextPlanId === existing.planId
        ? Promise.resolve(existing.plan)
        : this.prisma.plan.findUnique({ where: { id: nextPlanId } }),
    ]);

    if (!nextUser) throw new BadRequestException('Usuario no encontrado');
    if (!nextPlan) throw new BadRequestException('Plan no encontrado');
    assertUserMatchesPlanType(nextUser, nextPlan);

    const nextStatus = dto.status ?? existing.status;
    const wasActive = existing.status === 'active';
    const willBeActive = nextStatus === 'active';
    const willBeCancelled = nextStatus === 'cancelled';
    const activating = willBeActive && !wasActive;
    const planChanged = nextPlanId !== existing.planId;

    const needsPoolAllocation =
      activating ||
      (willBeActive && wasActive && planChanged) ||
      (willBeActive && !existing.endsAt);

    if (needsPoolAllocation) {
      const allocation = await this.prisma.subscriptionPoolAllocation.findUnique({
        where: { subscriptionId: existing.id },
        select: { returned: true },
      });
      // Reactivar tras cancelar solo re-compromete el restante ya devuelto,
      // no exige el total del plan en bolsa.
      const isReactivation =
        activating && allocation != null && allocation.returned > 0;
      if (!isReactivation) {
        await this.planPool.assertPlanPurchasable(nextPlan);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (willBeCancelled && wasActive) {
        await this.subscriptionPool.returnUnusedCredits(tx, existing.id);
      }

      if (activating) {
        await this.cancelOverlappingActive(tx, nextUserId, nextPlan);
      }

      const reactivate = willBeActive && wasActive && planChanged;

      if (reactivate) {
        await this.subscriptionPool.returnUnusedCredits(tx, existing.id);
        await tx.subscriptionPoolAllocation.deleteMany({
          where: { subscriptionId: existing.id },
        });
      }

      const endsAt = willBeActive
        ? this.computeEndsAt(
            nextPlan,
            activating || reactivate || !existing.endsAt
              ? new Date()
              : (existing.endsAt ?? new Date()),
          )
        : existing.endsAt;

      return tx.subscription.update({
        where: { id: BigInt(id) },
        data: {
          userId: dto.userId ? nextUserId : undefined,
          planId: dto.planId ? nextPlanId : undefined,
          status: dto.status ?? existing.status,
          endsAt: willBeActive ? endsAt : existing.endsAt,
        },
        include: { plan: { select: { planType: true } } },
      });
    });

    if (updated.status === 'active') {
      await this.reservePoolForActiveSubscription(updated.id, nextPlan);
    }

    if (updated.status === 'active' && updated.plan.planType === 'business') {
      await syncOrganizationSeatLimitForUser(this.prisma, updated.userId);
    }

    const providers = await this.listAllProviders();
    return loadAdminSubscriptionById(this.prisma, updated.id, providers);
  }

  /** Borra la suscripción — cascada solo sobre su propio `SubscriptionUsage`
   * (`onDelete: Cascade` en el schema), no afecta otras suscripciones ni los
   * `Analysis` en sí. */
  remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { id: BigInt(id) },
      });
      if (!sub) throw new BadRequestException('Suscripción no encontrada');
      if (sub.status === 'active') {
        await this.subscriptionPool.returnUnusedCredits(tx, sub.id);
      }
      await tx.subscription.delete({ where: { id: sub.id } });
    });
  }

  /** Incluye `remainingCredits` por suscripción (página de "consumo") —
   * reusa el mismo cálculo que ya usa AnalysesService al descontar créditos. */
  async findMine(userId: bigint) {
    const ctx = await this.orgContext.resolve(userId.toString());
    this.orgContext.assertTeamPermission(ctx, 'billing');

    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId: ctx.subscriptionUserId },
      include: {
        plan: { include: { provider: true } },
        invoice: {
          select: {
            id: true,
            grossAmount: true,
            planBaseAmount: true,
            ivaAmount: true,
            currency: true,
            createdAt: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const withEndsAt = await Promise.all(
      subscriptions.map(async (subscription) => {
        const endsAt = await this.ensureSubscriptionEndsAt(subscription);
        if (endsAt) subscription.endsAt = endsAt;
        return subscription;
      }),
    );

    return Promise.all(
      withEndsAt.map(async (subscription) =>
        serializeUserSubscription(
          subscription,
          await this.remainingCredits(
            this.prisma,
            subscription.id,
            subscription.plan.analysisLimit,
          ),
        ),
      ),
    );
  }

  /**
   * Activa/cancela una suscripción `pending` a partir del resultado de Wompi
   * (webhook — MIGRACION.md §2.3). Idempotente: si no hay una suscripción
   * `pending` con esa referencia (ya procesada, o referencia desconocida),
   * no hace nada — evita duplicar el incidente de reintentos de YouCam.
   */
  async activateFromWompi(
    reference: string,
    wompiTransactionId: string,
    wompiStatus: string,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { wompiTransactionId: reference, status: 'pending' },
      include: { plan: { include: { provider: true } }, user: true },
    });

    if (!subscription) {
      this.logger.warn(
        `Webhook Wompi: no hay suscripción pendiente para la referencia ${reference} (ya procesada o desconocida)`,
      );
      return;
    }

    if (APPROVED_STATUSES.includes(wompiStatus)) {
      const balances = await this.planPool.getBalances();
      const pool = await this.planPool.evaluatePlan(subscription.plan, balances);
      if (!pool.poolPurchasable) {
        await this.holdPaidSubscriptionInPrebolsa(
          subscription,
          wompiTransactionId,
        );
        return;
      }
      await this.activatePaidSubscription(subscription, wompiTransactionId);
      return;
    }

    if (CANCELLED_STATUSES.includes(wompiStatus)) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'cancelled', wompiTransactionId },
      });
    }
    // Cualquier otro estado (ej. PENDING): no-op, se espera la siguiente entrega del webhook.
  }

  /**
   * Pago confirmado y bolsa corta: queda en prebolsa (`pending` + `awaitingPool`)
   * hasta que el cron encuentre créditos del tipo de análisis.
   */
  private async holdPaidSubscriptionInPrebolsa(
    subscription: PaidSubscription,
    wompiTransactionId: string,
  ): Promise<void> {
    const held = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM subscriptions WHERE id = ${subscription.id} FOR UPDATE`;
      const current = await tx.subscription.findUnique({
        where: { id: subscription.id },
      });
      if (!current || current.status !== 'pending' || current.awaitingPool) {
        return false;
      }
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { awaitingPool: true, wompiTransactionId },
      });
      return true;
    });
    if (!held) return;
    await this.recordPaidSale(subscription, wompiTransactionId);
    try {
      await this.mail.send({
        to: subscription.user.email,
        subject: 'Pago recibido — tu plan está en prebolsa — Piel360',
        html: `<p>Hola ${subscription.user.name},</p><p>Recibimos el pago del plan <strong>${subscription.plan.name}</strong>. Se activará en cuanto haya ${subscription.plan.analysisLimit} créditos de ese análisis en la bolsa.</p>`,
      });
    } catch (err) {
      this.logger.error(
        `No se pudo avisar la prebolsa de la suscripción ${subscription.id}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  /** Pasa a activa una compra ya pagada y reserva los créditos de la bolsa. */
  private async activatePaidSubscription(
    subscription: PaidSubscription,
    wompiTransactionId: string,
  ): Promise<void> {
    const endsAt = this.computeEndsAt(subscription.plan);
    const activated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM subscriptions WHERE id = ${subscription.id} FOR UPDATE`;
      const current = await tx.subscription.findUnique({
        where: { id: subscription.id },
      });
      if (!current || current.status !== 'pending') return false;
      await this.cancelOverlappingActive(tx, subscription.userId, subscription.plan);
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
          awaitingPool: false,
          wompiTransactionId,
          endsAt,
        },
      });
      await this.subscriptionPool.allocateForSubscription(
        tx,
        subscription.id,
        subscription.plan,
      );
      if (subscription.plan.planType === 'business') {
        await syncOrganizationSeatLimitForUser(tx, subscription.userId);
      }
      return true;
    });
    if (!activated) return;
    await this.recordPaidSale(subscription, wompiTransactionId);
    try {
      await this.mail.send({
        to: subscription.user.email,
        subject: 'Tu suscripción está activa — Piel360',
        html: `<p>Hola ${subscription.user.name},</p><p>Tu suscripción al plan <strong>${subscription.plan.name}</strong> ya está activa. Tienes ${subscription.plan.analysisLimit} análisis disponibles hasta el ${endsAt.toLocaleDateString('es-CO')}.</p>`,
      });
    } catch (err) {
      this.logger.error(
        `No se pudo avisar la activación de la suscripción ${subscription.id}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  private async recordPaidSale(
    subscription: PaidSubscription,
    wompiTransactionId: string,
  ): Promise<void> {
    try {
      await this.billing.recordSubscriptionSale({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        planId: subscription.planId,
        planPrice: subscription.plan.price,
        wompiTransactionId,
      });
    } catch (err) {
      this.logger.error(
        `No se pudo registrar factura de suscripción ${subscription.id}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  /**
   * Activa en orden de compra las prebolsas cuyo tipo de análisis ya cabe en la bolsa.
   * Cada activación vuelve a leer saldos, así no se compromete dos veces el mismo crédito.
   */
  async releasePrebolsa(): Promise<number> {
    const waiting = await this.prisma.subscription.findMany({
      where: { status: 'pending', awaitingPool: true },
      include: { plan: { include: { provider: true } }, user: true },
      orderBy: { id: 'asc' },
    });
    if (waiting.length === 0) return 0;

    let balances = await this.planPool.getBalances();
    let activated = 0;
    for (const subscription of waiting) {
      const pool = await this.planPool.evaluatePlan(subscription.plan, balances);
      if (!pool.poolPurchasable) continue;
      try {
        await this.activatePaidSubscription(
          subscription,
          subscription.wompiTransactionId ?? '',
        );
        activated += 1;
        balances = await this.planPool.getBalances();
      } catch (err) {
        this.logger.error(
          `Prebolsa: no se pudo activar la suscripción ${subscription.id}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
    return activated;
  }
}
