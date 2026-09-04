import { BadRequestException, Injectable } from '@nestjs/common';
import type { Plan, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parsePlanProviderIds } from '../plans/plan-providers.util';

export type PoolProvider = 'skiniver' | 'perfectcorp';

export type PoolMovementKind = 'subscription_return' | 'subscription_reserve';

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

  /** Solo recargas admin (`kind=recharge`) alimentan el saldo de la bolsa. */
  async getSkiniverRechargeTotal(db: Db = this.prisma): Promise<number> {
    const now = Date.now();
    const recharges = await db.platformUnitRecharge.findMany({
      where: {
        provider: SKINIVER_SLUG,
        kind: 'recharge',
        quantity: { gt: 0 },
      },
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

  private async consumedCredits(db: Db, subscriptionId: bigint): Promise<number> {
    const used = await db.subscriptionUsage.aggregate({
      where: { subscriptionId },
      _sum: { quantity: true },
    });
    return used._sum.quantity ?? 0;
  }

  private async assertSkiniverAvailable(db: Db, required: number): Promise<void> {
    if (required <= 0) return;
    const available = await this.getSkiniverAvailable(db);
    if (available < required) {
      throw new BadRequestException(
        `Bolsa Skiniver insuficiente: hay ${available} créditos disponibles y se requieren ${required}.`,
      );
    }
  }

  private ledgerProvider(poolProvider: PoolProvider): string {
    return poolProvider === 'skiniver' ? SKINIVER_SLUG : 'perfectcorp';
  }

  /** Registra movimiento en historial sin alterar el saldo de recargas. */
  private async recordSubscriptionMovement(
    db: Db,
    input: {
      poolProvider: PoolProvider;
      kind: PoolMovementKind;
      amount: number;
      subscriptionId: bigint;
    },
  ): Promise<void> {
    if (input.amount <= 0) return;
    const signed =
      input.kind === 'subscription_return' ? input.amount : -input.amount;
    const action =
      input.kind === 'subscription_return' ? 'Cancelación' : 'Activación';
    await db.platformUnitRecharge.create({
      data: {
        provider: this.ledgerProvider(input.poolProvider),
        kind: input.kind,
        quantity: signed,
        note: `${action} suscripción #${input.subscriptionId} (${input.amount} créditos)`,
      },
    });
  }

  /**
   * Reserva créditos de la bolsa al activar una suscripción.
   * - Alta nueva: reserva `plan.analysisLimit`.
   * - Reactivación tras cancelar: vuelve a comprometer exactamente lo
   *   devuelto (`returned`), no el total del plan.
   */
  async allocateForSubscription(
    db: Db,
    subscriptionId: bigint,
    plan: Plan,
    options?: { recordMovement?: boolean },
  ): Promise<void> {
    const recordMovement = options?.recordMovement !== false;
    const quantity = plan.analysisLimit;
    if (quantity <= 0) return;

    const slugMap = await this.providerSlugMap(db);
    const poolProvider = await this.resolvePoolProvider(plan, slugMap);

    const existing = await db.subscriptionPoolAllocation.findUnique({
      where: { subscriptionId },
    });

    // Reactivar: solo re-comprometer lo que se había devuelto a la bolsa.
    if (existing && existing.returned > 0) {
      const toReserve = existing.returned;
      if (poolProvider === 'skiniver') {
        await this.assertSkiniverAvailable(db, toReserve);
      }
      await db.subscriptionPoolAllocation.update({
        where: { subscriptionId },
        data: {
          poolProvider,
          returned: 0,
        },
      });
      if (recordMovement) {
        await this.recordSubscriptionMovement(db, {
          poolProvider,
          kind: 'subscription_reserve',
          amount: toReserve,
          subscriptionId,
        });
      }
      return;
    }

    const netCommitted = existing
      ? existing.allocated - existing.returned
      : 0;

    if (netCommitted >= quantity) return;

    const toReserve = quantity - netCommitted;
    if (poolProvider === 'skiniver') {
      await this.assertSkiniverAvailable(db, toReserve);
    }

    if (existing) {
      await db.subscriptionPoolAllocation.update({
        where: { subscriptionId },
        data: {
          poolProvider,
          allocated: existing.allocated + toReserve,
          returned: 0,
        },
      });
    } else {
      await db.subscriptionPoolAllocation.create({
        data: {
          subscriptionId,
          poolProvider,
          allocated: quantity,
        },
      });
    }

    if (recordMovement) {
      await this.recordSubscriptionMovement(db, {
        poolProvider,
        kind: 'subscription_reserve',
        amount: toReserve,
        subscriptionId,
      });
    }
  }

  /**
   * Devuelve a la bolsa solo los créditos no usados (restante de la suscripción).
   * La disponibilidad sube al incrementar `returned` (baja el compromiso neto).
   * El movimiento en historial es informativo (`kind=subscription_return`).
   */
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

    const consumed = await this.consumedCredits(db, subscriptionId);
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

    await this.recordSubscriptionMovement(db, {
      poolProvider: allocation.poolProvider as PoolProvider,
      kind: 'subscription_return',
      amount: toReturn,
      subscriptionId,
    });

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
      const needsRecommit = (sub.poolAllocation?.returned ?? 0) > 0;
      if (needsRecommit || net < sub.plan.analysisLimit) {
        await this.allocateForSubscription(db, sub.id, sub.plan, {
          recordMovement: false,
        });
        synced += 1;
      }
    }
    return synced;
  }
}
