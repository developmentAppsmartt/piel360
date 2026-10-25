import { BadRequestException, Injectable } from '@nestjs/common';
import type { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionPoolService,
  type PoolProvider,
} from '../subscriptions/subscription-pool.service';
import { YouCamService } from '../youcam/youcam.service';

export type PlanPoolStatus = {
  poolProvider: PoolProvider;
  poolAvailable: number;
  poolRequired: number;
  poolPurchasable: boolean;
  poolUnavailableReason: string | null;
};

export type PoolBalances = {
  skiniver: number;
  perfectcorp: number;
};

const POOL_LABELS: Record<PoolProvider, string> = {
  skiniver: 'Análisis Dermatológico',
  perfectcorp: 'Análisis Estético',
};

@Injectable()
export class PlanPoolAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionPool: SubscriptionPoolService,
    private readonly youcam: YouCamService,
  ) {}

  async getBalances(): Promise<PoolBalances> {
    const [skiniver, perfectcorpApi, committedPerfectcorp] = await Promise.all([
      this.subscriptionPool.getSkiniverAvailable(),
      this.youcam
        .getCreditBalances()
        .then((rows) => rows.reduce((sum, row) => sum + row.amount, 0))
        .catch(() => 0),
      this.subscriptionPool.getCommittedCredits(this.prisma, 'perfectcorp'),
    ]);

    return {
      skiniver,
      perfectcorp: Math.max(0, perfectcorpApi - committedPerfectcorp),
    };
  }

  private async providerSlugMap() {
    const rows = await this.prisma.analysisProvider.findMany({
      select: { id: true, slug: true },
    });
    return new Map(rows.map((row) => [row.id.toString(), row.slug]));
  }

  async evaluatePlan(
    plan: Pick<Plan, 'analysisProviderIds' | 'analysisProviderId' | 'analysisLimit'>,
    balances: PoolBalances,
    slugMap?: Map<string, string>,
  ): Promise<PlanPoolStatus> {
    const map = slugMap ?? (await this.providerSlugMap());
    const poolProvider = await this.subscriptionPool.resolvePoolProvider(plan, map);
    const available =
      poolProvider === 'skiniver' ? balances.skiniver : balances.perfectcorp;
    const required = plan.analysisLimit;
    const poolPurchasable = required <= 0 || available >= required;
    const poolLabel = POOL_LABELS[poolProvider];

    return {
      poolProvider,
      poolAvailable: available,
      poolRequired: required,
      poolPurchasable,
      poolUnavailableReason: poolPurchasable
        ? null
        : `Bolsa ${poolLabel} insuficiente: hay ${available} créditos disponibles y el plan requiere ${required}.`,
    };
  }

  async enrichPlans<T extends Plan>(plans: T[]): Promise<Array<T & PlanPoolStatus>> {
    if (plans.length === 0) return [];
    const [balances, slugMap] = await Promise.all([
      this.getBalances(),
      this.providerSlugMap(),
    ]);
    return Promise.all(
      plans.map(async (plan) => ({
        ...plan,
        ...(await this.evaluatePlan(plan, balances, slugMap)),
      })),
    );
  }

  async getAlerts() {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      include: { provider: true },
      orderBy: { name: 'asc' },
    });
    const enriched = await this.enrichPlans(plans);
    const unavailablePlans = enriched
      .filter((plan) => !plan.poolPurchasable)
      .map((plan) => ({
        id: plan.id.toString(),
        name: plan.name,
        analysisLimit: plan.analysisLimit,
        poolProvider: plan.poolProvider,
        poolAvailable: plan.poolAvailable,
        poolRequired: plan.poolRequired,
        poolUnavailableReason: plan.poolUnavailableReason,
        provider: {
          id: plan.provider.id.toString(),
          name: plan.provider.name,
          slug: plan.provider.slug,
        },
      }));

    const balances = await this.getBalances();

    return {
      fetchedAt: new Date().toISOString(),
      balances,
      hasAlerts: unavailablePlans.length > 0,
      unavailablePlans,
    };
  }

  /** Compras pendientes: sin pagar, pagadas esperando créditos, o listas para el cron. */
  async listPrebolsa() {
    const rows = await this.prisma.subscription.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: true,
      },
      orderBy: { id: 'asc' },
    });
    const balances = await this.getBalances();
    const items = await Promise.all(
      rows.map(async (row) => {
        const pool = await this.evaluatePlan(row.plan, balances);
        const stage = !row.awaitingPool
          ? 'pendingPayment'
          : pool.poolPurchasable
            ? 'ready'
            : 'awaitingCredits';
        return {
          id: row.id.toString(),
          stage,
          createdAt: row.createdAt.toISOString(),
          user: {
            id: row.user.id.toString(),
            name: row.user.name,
            email: row.user.email,
          },
          plan: {
            id: row.plan.id.toString(),
            name: row.plan.name,
            analysisLimit: row.plan.analysisLimit,
          },
          poolProvider: pool.poolProvider,
          poolLabel: POOL_LABELS[pool.poolProvider],
          poolAvailable: pool.poolAvailable,
          poolRequired: pool.poolRequired,
        };
      }),
    );

    return {
      fetchedAt: new Date().toISOString(),
      balances,
      counts: {
        pendingPayment: items.filter((item) => item.stage === 'pendingPayment').length,
        awaitingCredits: items.filter((item) => item.stage === 'awaitingCredits').length,
        ready: items.filter((item) => item.stage === 'ready').length,
      },
      items,
    };
  }

  async assertPlanPurchasable(
    plan: Pick<Plan, 'analysisProviderIds' | 'analysisProviderId' | 'analysisLimit' | 'isActive'>,
  ): Promise<void> {
    if (!plan.isActive) {
      throw new BadRequestException('Plan no disponible');
    }
    const status = await this.evaluatePlan(plan, await this.getBalances());
    if (!status.poolPurchasable && status.poolUnavailableReason) {
      throw new BadRequestException(status.poolUnavailableReason);
    }
  }
}
