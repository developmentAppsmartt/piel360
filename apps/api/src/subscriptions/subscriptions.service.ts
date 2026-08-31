import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { AnalysisProviderSlug } from '@piel360/shared';
import type { Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  parsePlanProviderIds,
  planIncludesProviderId,
} from '../plans/plan-providers.util';
import type { CreateSubscriptionDto } from './dto/create-subscription.dto';
import type { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { syncOrganizationSeatLimitForUser } from '../organizations/org-seat-limit.util';
import {
  assertUserMatchesPlanType,
  loadAdminSubscriptionById,
  serializeAdminSubscription,
} from './subscription-admin.util';

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
    const provider = await db.analysisProvider.findUnique({
      where: { slug: providerSlug },
    });
    if (!provider) return null;

    const subscriptions = await db.subscription.findMany({
      where: {
        userId,
        status: 'active',
        endsAt: { gt: new Date() },
      },
      include: { plan: { include: { provider: true } } },
      orderBy: { id: 'desc' },
    });

    return (
      subscriptions.find((subscription) =>
        planIncludesProviderId(subscription.plan, provider.id),
      ) ?? null
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

  /** Creación manual (admin), sin pasar por Wompi — MIGRACION.md §2.4.
   * `status`/`endsAt` son opcionales (compatibilidad con el único caller
   * actual, que no los envía): si se omiten, se mantiene el comportamiento
   * original (`active` + vencimiento calculado desde `plan.durationDays`). */
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

    let endsAt: Date | undefined;
    if (dto.endsAt) {
      endsAt = new Date(dto.endsAt);
    } else {
      endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + plan.durationDays);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: dto.status ?? 'active',
        endsAt,
      },
    });

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

    const updated = await this.prisma.subscription.update({
      where: { id: BigInt(id) },
      data: {
        userId: dto.userId ? nextUserId : undefined,
        planId: dto.planId ? nextPlanId : undefined,
        status: dto.status,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
      include: { plan: { select: { planType: true } } },
    });

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
    return this.prisma.subscription.delete({ where: { id: BigInt(id) } });
  }

  /** Incluye `remainingCredits` por suscripción (página de "consumo") —
   * reusa el mismo cálculo que ya usa AnalysesService al descontar créditos. */
  async findMine(userId: bigint) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId },
      include: { plan: { include: { provider: true } } },
      orderBy: { id: 'desc' },
    });

    return Promise.all(
      subscriptions.map(async (subscription) => ({
        ...subscription,
        remainingCredits: await this.remainingCredits(
          this.prisma,
          subscription.id,
          subscription.plan.analysisLimit,
        ),
      })),
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
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + subscription.plan.durationDays);

      await this.prisma.$transaction(async (tx) => {
        const activeSubs = await tx.subscription.findMany({
          where: {
            userId: subscription.userId,
            status: 'active',
          },
          include: { plan: true },
        });
        const newProviderIds = new Set(
          parsePlanProviderIds(subscription.plan),
        );
        for (const active of activeSubs) {
          const activeIds = parsePlanProviderIds(active.plan);
          const overlaps = activeIds.some((id) => newProviderIds.has(id));
          if (overlaps) {
            await tx.subscription.update({
              where: { id: active.id },
              data: { status: 'cancelled' },
            });
          }
        }

        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: 'active', wompiTransactionId, endsAt },
        });

        if (subscription.plan.planType === 'business') {
          await syncOrganizationSeatLimitForUser(tx, subscription.userId);
        }
      });

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
