import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionPoolService,
  type PoolProvider,
} from '../subscriptions/subscription-pool.service';
import { AnalisisPiel360Service } from '../youcam/youcam.service';
import {
  POOL_PUBLIC_ALIASES,
  toPublicPoolSlug,
  toPublicProviderSlug,
} from '@piel360/shared';
import { bagCreditsForPlan } from '../subscriptions/bag-credits';
import { aestheticRechargeCredits } from '../youcam/youcam-credit-history';

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
  private readonly logger = new Logger(PlanPoolAvailabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionPool: SubscriptionPoolService,
    private readonly youcam: AnalisisPiel360Service,
  ) {}

  async getBalances(): Promise<PoolBalances> {
    await this.subscriptionPool.syncActiveSubscriptionPools();
    const [skiniver, history, committedAnalisisPiel360] = await Promise.all([
      this.subscriptionPool.getAnalisisDermaPiel360Available(),
      this.youcam.getCreditHistory().catch((err: unknown) => {
        this.logger.warn(
          `No se pudo leer el historial estético para la bolsa: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        return [];
      }),
      this.subscriptionPool.getCommittedCredits(this.prisma, 'perfectcorp'),
    ]);

    return {
      skiniver,
      perfectcorp: Math.max(
        0,
        aestheticRechargeCredits(history) - committedAnalisisPiel360,
      ),
    };
  }

  private async providerSlugMap() {
    const rows = await this.prisma.analysisProvider.findMany({
      select: { id: true, slug: true },
    });
    return new Map(rows.map((row) => [row.id.toString(), row.slug]));
  }

  async evaluatePlan(
    plan: Pick<
      Plan,
      | 'analysisProviderIds'
      | 'analysisProviderId'
      | 'analysisLimit'
      | 'analysisLimits'
    >,
    balances: PoolBalances,
    slugMap?: Map<string, string>,
  ): Promise<PlanPoolStatus> {
    const map = slugMap ?? (await this.providerSlugMap());
    const poolProvider = this.subscriptionPool.resolvePoolProvider(plan, map);
    const available =
      poolProvider === 'skiniver' ? balances.skiniver : balances.perfectcorp;
    const required = bagCreditsForPlan(plan, map);
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

  async enrichPlans<T extends Plan>(
    plans: T[],
  ): Promise<Array<T & PlanPoolStatus>> {
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
      where: { isActive: true, replacedAt: null },
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
        poolProvider: toPublicPoolSlug(plan.poolProvider),
        poolAvailable: plan.poolAvailable,
        poolRequired: plan.poolRequired,
        poolUnavailableReason: plan.poolUnavailableReason,
        provider: {
          id: plan.provider.id.toString(),
          name: plan.provider.displayLabel?.trim() || plan.provider.name,
          slug: toPublicProviderSlug(plan.provider.slug),
        },
      }));

    const balances = await this.getBalances();

    return {
      fetchedAt: new Date().toISOString(),
      // La alerta se pinta en el panel, asi que las bolsas salen con su slug
      // publico; por dentro siguen siendo `skiniver` y `perfectcorp`.
      balances: {
        [POOL_PUBLIC_ALIASES.skiniver]: balances.skiniver,
        [POOL_PUBLIC_ALIASES.perfectcorp]: balances.perfectcorp,
      },
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
          poolProvider: toPublicPoolSlug(pool.poolProvider),
          poolLabel: POOL_LABELS[pool.poolProvider],
          poolAvailable: pool.poolAvailable,
          poolRequired: pool.poolRequired,
        };
      }),
    );

    return {
      fetchedAt: new Date().toISOString(),
      balances: {
        [POOL_PUBLIC_ALIASES.skiniver]: balances.skiniver,
        [POOL_PUBLIC_ALIASES.perfectcorp]: balances.perfectcorp,
      },
      counts: {
        pendingPayment: items.filter((item) => item.stage === 'pendingPayment')
          .length,
        awaitingCredits: items.filter(
          (item) => item.stage === 'awaitingCredits',
        ).length,
        ready: items.filter((item) => item.stage === 'ready').length,
      },
      items,
    };
  }

  async assertPlanPurchasable(
    plan: Pick<
      Plan,
      | 'analysisProviderIds'
      | 'analysisProviderId'
      | 'analysisLimit'
      | 'analysisLimits'
      | 'isActive'
      | 'replacedAt'
    >,
  ): Promise<void> {
    if (!plan.isActive || plan.replacedAt) {
      throw new BadRequestException('Plan no disponible');
    }
    const status = await this.evaluatePlan(plan, await this.getBalances());
    if (!status.poolPurchasable && status.poolUnavailableReason) {
      throw new BadRequestException(status.poolUnavailableReason);
    }
  }
}
