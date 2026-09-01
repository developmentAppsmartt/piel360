import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import type { AnalysisProviderSlug } from '@piel360/shared';
import type { Prisma, Plan } from '@prisma/client';
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
    await this.planPool.assertPlanPurchasable(plan);
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
      await this.planPool.assertPlanPurchasable(nextPlan);
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
      include: { plan: { include: { provider: true } } },
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
      await this.planPool.assertPlanPurchasable(subscription.plan);
      const endsAt = this.computeEndsAt(subscription.plan);

      await this.prisma.$transaction(async (tx) => {
        await this.cancelOverlappingActive(tx, subscription.userId, subscription.plan);

        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: 'active', wompiTransactionId, endsAt },
        });

        if (subscription.plan.planType === 'business') {
          await syncOrganizationSeatLimitForUser(tx, subscription.userId);
        }
      });

      await this.reservePoolForActiveSubscription(
        subscription.id,
        subscription.plan,
      );

      await this.mail.send({
        to: subscription.user.email,
        subject: 'Tu suscripción está activa — Piel360',
        html: `<p>Hola ${subscription.user.name},</p><p>Tu suscripción al plan <strong>${subscription.plan.name}</strong> ya está activa. Tienes ${subscription.plan.analysisLimit} análisis disponibles hasta el ${endsAt.toLocaleDateString('es-CO')}.</p>`,
      });
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
}
