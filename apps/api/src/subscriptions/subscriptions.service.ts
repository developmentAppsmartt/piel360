import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { AnalysisProviderSlug } from '@piel360/shared';
import type { Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSubscriptionDto } from './dto/create-subscription.dto';

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

  async findActiveForUser(
    db: Db,
    userId: bigint,
    providerSlug: AnalysisProviderSlug,
  ) {
    return db.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        endsAt: { gt: new Date() },
        plan: { provider: { slug: providerSlug } },
      },
      include: { plan: true },
    });
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

  /** Creación manual (admin), sin pasar por Wompi — MIGRACION.md §2.4. */
  async createManual(dto: CreateSubscriptionDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: BigInt(dto.planId) },
    });
    if (!plan) throw new BadRequestException('Plan no encontrado');

    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + plan.durationDays);

    return this.prisma.subscription.create({
      data: {
        userId: BigInt(dto.userId),
        planId: plan.id,
        status: 'active',
        endsAt,
      },
    });
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
        await tx.subscription.updateMany({
          where: {
            userId: subscription.userId,
            status: 'active',
            plan: { analysisProviderId: subscription.plan.analysisProviderId },
          },
          data: { status: 'cancelled' },
        });

        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: 'active', wompiTransactionId, endsAt },
        });
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
