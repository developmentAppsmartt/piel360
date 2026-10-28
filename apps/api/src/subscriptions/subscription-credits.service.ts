import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AnalysisProviderSlug } from '@piel360/shared';
import type { Prisma } from '@prisma/client';
import { OrgContextService } from '../organizations/org-context.service';
import { planIncludesProviderId } from '../plans/plan-providers.util';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSubscriptionEndsAt } from './subscription-ends.util';

type Db = PrismaService | Prisma.TransactionClient;

/** De qué suscripción sale cada análisis y cuánto le queda. */
@Injectable()
export class SubscriptionCreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
  ) {}

  /**
   * La suscripción de la que se descuenta un análisis del proveedor.
   *
   * Un profesional puede tener varias activas que cubren el mismo análisis
   * (comprar un plan ya no cancela el anterior). Se gasta primero la que vence
   * antes, para no perder créditos; en empate, la más antigua. Si ninguna
   * tiene créditos se devuelve igual la primera, para que quien llama responda
   * «sin créditos» y no «sin suscripción».
   */
  async findActiveForUser(
    db: Db,
    userId: bigint,
    providerSlug: AnalysisProviderSlug,
  ) {
    const ctx = await this.orgContext.resolve(userId.toString());

    const provider = await db.analysisProvider.findUnique({
      where: { slug: providerSlug },
    });
    if (!provider) return null;

    const subscriptions = await db.subscription.findMany({
      where: { userId: ctx.subscriptionUserId, status: 'active' },
      include: { plan: { include: { provider: true } } },
    });

    const now = new Date();
    const vigentes = subscriptions
      .filter((subscription) =>
        planIncludesProviderId(subscription.plan, provider.id),
      )
      .map((subscription) => ({
        subscription,
        endsAt: resolveSubscriptionEndsAt(subscription, subscription.plan),
      }))
      .filter(
        (row): row is typeof row & { endsAt: Date } =>
          row.endsAt !== null && row.endsAt > now,
      )
      .sort(
        (a, b) =>
          a.endsAt.getTime() - b.endsAt.getTime() ||
          Number(a.subscription.id - b.subscription.id),
      )
      .map((row) => row.subscription);
    if (vigentes.length === 0) return null;

    const usage = await db.subscriptionUsage.groupBy({
      by: ['subscriptionId'],
      where: { subscriptionId: { in: vigentes.map((s) => s.id) } },
      _sum: { quantity: true },
    });
    const used = new Map(
      usage.map((row) => [row.subscriptionId, row._sum.quantity ?? 0]),
    );
    return (
      vigentes.find((s) => s.plan.analysisLimit - (used.get(s.id) ?? 0) > 0) ??
      vigentes[0]
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

  /** Un análisis gasta 1 del cupo ya asignado. La bolsa no se vuelve a tocar. */
  async consumeCredit(db: Db, subscriptionId: bigint, analysisId: bigint) {
    return db.subscriptionUsage.create({
      data: { subscriptionId, analysisId, quantity: 1 },
    });
  }
}
