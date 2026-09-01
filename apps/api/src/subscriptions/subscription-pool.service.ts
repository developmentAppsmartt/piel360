import { BadRequestException, Injectable } from '@nestjs/common';
import type { Plan, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parsePlanProviderIds } from '../plans/plan-providers.util';

export type PoolProvider = 'skiniver' | 'perfectcorp';

const SKINIVER_SLUG = 'skiniver';
const AESTHETIC_SLUGS = new Set(['youcam', 'fitzpatrick']);

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SubscriptionPoolService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePoolProvider(
    plan: Pick<Plan, 'analysisProviderIds' | 'analysisProviderId'>,
    providerSlugsById: Map<string, string>,
  ): Promise<PoolProvider> {
    const ids = parsePlanProviderIds(plan);
    const slugs = ids
      .map((id) => providerSlugsById.get(id))
      .filter((s): s is string => Boolean(s));

    const hasSkiniver = slugs.includes(SKINIVER_SLUG);
    const hasAesthetic = slugs.some((s) => AESTHETIC_SLUGS.has(s));

    if (hasSkiniver && !hasAesthetic) return 'skiniver';
    if (hasAesthetic && !hasSkiniver) return 'perfectcorp';
    if (hasAesthetic) return 'perfectcorp';
    return 'skiniver';
  }

  async getCommittedCredits(db: Db, poolProvider: PoolProvider): Promise<number> {
    const rows = await db.subscriptionPoolAllocation.findMany({
      where: { poolProvider },
      select: { allocated: true, returned: true },
    });
    return rows.reduce((sum, row) => sum + row.allocated - row.returned, 0);
  }

  async getSkiniverRechargeTotal(db: Db = this.prisma): Promise<number> {
    const now = Date.now();
    const recharges = await db.platformUnitRecharge.findMany({
      where: { provider: SKINIVER_SLUG },
      select: { quantity: true, expiresAt: true },
    });
    return recharges
      .filter((r) => !r.expiresAt || r.expiresAt.getTime() > now)
      .reduce((sum, r) => sum + r.quantity, 0);
  }

  async getSkiniverAvailable(db: Db = this.prisma): Promise<number> {
    const [total, committed] = await Promise.all([
      this.getSkiniverRechargeTotal(db),
      this.getCommittedCredits(db, 'skiniver'),
    ]);
    return Math.max(0, total - committed);
  }

  private async providerSlugMap(db: Db) {
    const rows = await db.analysisProvider.findMany({
      select: { id: true, slug: true },
    });
    return new Map(rows.map((r) => [r.id.toString(), r.slug]));
  }

  /**
   * Reserva créditos de la bolsa al activar una suscripción.
   * Idempotente: si ya hay reserva neta suficiente no hace nada.
   * Si hubo devolución (cancelación previa) o nunca se reservó, vuelve a comprometer.
   */
  async allocateForSubscription(
    db: Db,
    subscriptionId: bigint,
    plan: Plan,
  ): Promise<void> {
    const quantity = plan.analysisLimit;
    if (quantity <= 0) return;

    const slugMap = await this.providerSlugMap(db);
    const poolProvider = await this.resolvePoolProvider(plan, slugMap);

    const existing = await db.subscriptionPoolAllocation.findUnique({
      where: { subscriptionId },
    });

    const netCommitted = existing
      ? existing.allocated - existing.returned
      : 0;

    if (netCommitted >= quantity) return;

    const toReserve = quantity - netCommitted;

    if (poolProvider === 'skiniver') {
      const available = await this.getSkiniverAvailable(db);
      if (available < toReserve) {
        throw new BadRequestException(
          `Bolsa Skiniver insuficiente: hay ${available} créditos disponibles y el plan requiere ${toReserve} adicionales (${quantity} en total).`,
        );
      }
    }

    if (existing) {
      await db.subscriptionPoolAllocation.update({
        where: { subscriptionId },
        data: {
          poolProvider,
          allocated: existing.allocated - existing.returned + toReserve,
          returned: 0,
        },
      });
      return;
    }

    await db.subscriptionPoolAllocation.create({
      data: {
        subscriptionId,
        poolProvider,
        allocated: quantity,
      },
    });
  }

  async returnUnusedCredits(db: Db, subscriptionId: bigint): Promise<number> {
    const allocation = await db.subscriptionPoolAllocation.findUnique({
      where: { subscriptionId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
    if (!allocation || allocation.returned >= allocation.allocated) {
      return 0;
    }

    const used = await db.subscriptionUsage.aggregate({
      where: { subscriptionId },
      _sum: { quantity: true },
    });
    const consumed = used._sum.quantity ?? 0;
    const remaining = Math.max(
      0,
      allocation.subscription.plan.analysisLimit - consumed,
    );
    const toReturn = Math.min(
      remaining,
      allocation.allocated - allocation.returned,
    );
    if (toReturn <= 0) return 0;

    await db.subscriptionPoolAllocation.update({
      where: { subscriptionId },
      data: { returned: allocation.returned + toReturn },
    });

    if (allocation.poolProvider === 'skiniver') {
      await db.platformUnitRecharge.create({
        data: {
          provider: SKINIVER_SLUG,
          quantity: toReturn,
          note: `Devolución suscripción #${subscriptionId} (${toReturn} créditos)`,
        },
      });
    }

    return toReturn;
  }

  /** Asegura que todas las suscripciones activas tengan créditos reservados en bolsa. */
  async syncActiveSubscriptionPools(db: Db = this.prisma): Promise<number> {
    const activeSubs = await db.subscription.findMany({
      where: { status: 'active' },
      include: { plan: true, poolAllocation: true },
    });

    let synced = 0;
    for (const sub of activeSubs) {
      const net = sub.poolAllocation
        ? sub.poolAllocation.allocated - sub.poolAllocation.returned
        : 0;
      if (net < sub.plan.analysisLimit) {
        await this.allocateForSubscription(db, sub.id, sub.plan);
        synced += 1;
      }
    }
    return synced;
  }
}
