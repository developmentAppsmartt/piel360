import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { BillingService } from '../billing/billing.service';
import { MailService } from '../mail/mail.service';
import { OrgContextService } from '../organizations/org-context.service';
import { syncOrganizationSeatLimitForUser } from '../organizations/org-seat-limit.util';
import { PlanPoolAvailabilityService } from '../plans/plan-pool-availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { serializeUserSubscription } from './subscription-admin.util';
import { SubscriptionCreditsService } from './subscription-credits.service';
import {
  computeSubscriptionEndsAt,
  ensureSubscriptionEndsAt,
} from './subscription-ends.util';
import { SubscriptionPoolService } from './subscription-pool.service';

type PaidSubscription = Prisma.SubscriptionGetPayload<{
  include: { plan: { include: { provider: true } }; user: true };
}>;

const APPROVED_STATUSES = ['APPROVED'];
const CANCELLED_STATUSES = ['DECLINED', 'VOIDED', 'ERROR'];

/**
 * Las suscripciones del profesional y su activación por el pago de Wompi.
 * El CRUD del admin vive en SubscriptionsAdminService y el descuento de
 * créditos en SubscriptionCreditsService.
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
    private readonly credits: SubscriptionCreditsService,
    @Inject(forwardRef(() => PlanPoolAvailabilityService))
    private readonly planPool: PlanPoolAvailabilityService,
  ) {}

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
        const endsAt = await ensureSubscriptionEndsAt(
          this.prisma,
          subscription,
        );
        if (endsAt) subscription.endsAt = endsAt;
        return subscription;
      }),
    );

    return Promise.all(
      withEndsAt.map(async (subscription) =>
        serializeUserSubscription(
          subscription,
          await this.credits.remainingCredits(
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
      const pool = await this.planPool.evaluatePlan(
        subscription.plan,
        balances,
      );
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
        html: `<p>Hola ${subscription.user.name},</p><p>Recibimos el pago del plan <strong>${subscription.plan.name}</strong>. Se activará en cuanto la bolsa tenga los créditos de ese plan.</p>`,
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
    const endsAt = computeSubscriptionEndsAt(subscription.plan);
    const activated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM subscriptions WHERE id = ${subscription.id} FOR UPDATE`;
      const current = await tx.subscription.findUnique({
        where: { id: subscription.id },
      });
      if (!current || current.status !== 'pending') return false;
      // Los planes que ya tenía siguen activos: se gastan primero los que
      // vencen antes (SubscriptionCreditsService.findActiveForUser).
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
      const pool = await this.planPool.evaluatePlan(
        subscription.plan,
        balances,
      );
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
