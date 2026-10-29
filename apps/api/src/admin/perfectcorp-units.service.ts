import { Injectable, Logger } from '@nestjs/common';
import { ANALISIS_PIEL360_DST_ACTIONS } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalisisPiel360Service,
  type AnalisisPiel360CreditBalance,
  type AnalisisPiel360CreditHistoryItem,
  type AnalisisPiel360FeatureSku,
} from '../youcam/youcam.service';
import { POOL_PUBLIC_ALIASES } from '@piel360/shared';
import { SubscriptionPoolService } from '../subscriptions/subscription-pool.service';
import {
  consumableAestheticBalance,
  isAestheticBagPurchase,
} from '../youcam/youcam-credit-history';
import { listBolsaPlanCupos } from './bolsa-plan-cupos';

/** Costo documentado Perfect Corp cuando el endpoint feature-cost no responde. */
const FALLBACK_FEATURE_COSTS = {
  skinAnalysisHdConcerns: ANALISIS_PIEL360_DST_ACTIONS.length,
  skinAnalysisHdUnits: 22,
  fitzpatrickUnits: 10,
} as const;

@Injectable()
export class AnalisisPiel360UnitsService {
  private readonly logger = new Logger(AnalisisPiel360UnitsService.name);

  constructor(
    private readonly youcam: AnalisisPiel360Service,
    private readonly prisma: PrismaService,
    private readonly subscriptionPool: SubscriptionPoolService,
  ) {}

  /**
   * Bolsa estética / Fitzpatrick = misma cuenta Perfect Corp (unidades
   * compartidas). Dermatológico (Skiniver) no usa este saldo.
   */
  async getAestheticUnitPool() {
    await this.subscriptionPool.syncActiveSubscriptionPools();
    const [balances, skus, history, planCupos, localReturns] =
      await Promise.all([
        this.youcam.getCreditBalances(),
        this.youcam.getFeatureCosts().catch((err) => {
          this.logger.warn(
            `feature-cost no disponible: ${err instanceof Error ? err.message : String(err)}`,
          );
          return [] as AnalisisPiel360FeatureSku[];
        }),
        this.youcam.getCreditHistory().catch((err) => {
          this.logger.warn(
            `credit/history no disponible: ${err instanceof Error ? err.message : String(err)}`,
          );
          return [] as AnalisisPiel360CreditHistoryItem[];
        }),
        listBolsaPlanCupos(this.prisma, 'perfectcorp'),
        this.prisma.platformUnitRecharge.findMany({
          where: { provider: 'perfectcorp', kind: 'subscription_return' },
          orderBy: { createdAt: 'desc' },
          take: 80,
          select: { id: true, quantity: true, note: true, createdAt: true },
        }),
      ]);

    const reservedInPlans = planCupos.reduce(
      (sum, row) => sum + row.credits,
      0,
    );
    const purchases = history.filter(isAestheticBagPurchase);
    // El número de la bolsa es el saldo vigente del proveedor, no la suma
    // de recargas históricas: esas siguen en el historial aunque ya se
    // gastaron o vencieron (por eso 2100 en pantalla y 5 en la plataforma).
    const live = consumableAestheticBalance(balances);
    const available = Math.max(0, live.live - reservedInPlans);

    return {
      source: POOL_PUBLIC_ALIASES.perfectcorp,
      fetchedAt: new Date().toISOString(),
      pool: {
        id: 'aesthetic' as const,
        name: 'Análisis estéticos / Fitzpatrick',
        accent: 'aesthetic' as const,
        available: round2(available),
        total: round2(live.live),
        used: round2(reservedInPlans),
        reserved: round2(reservedInPlans),
        expiringSoon: round2(live.expiringSoon),
        unitLabel: 'unidades' as const,
        rechargedRecent: round2(live.live),
      },
      balances: balances.map(serializeBalance),
      featureCosts: summarizeFeatureCosts(skus),
      planCupos,
      history: [
        ...localReturns.map((row) => ({
          id: `return-${row.id.toString()}`,
          action: 'subscription_return',
          delta: row.quantity,
          timestamp: row.createdAt.toISOString(),
          targetId: null,
          dstActions: [] as string[],
          note: row.note,
        })),
        ...purchases.map(serializeHistory),
      ].sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      }),
    };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function serializeBalance(b: AnalisisPiel360CreditBalance) {
  return {
    id: b.id,
    type: b.type,
    amount: round2(b.amount),
    expiry: b.expiryMs ? new Date(b.expiryMs).toISOString() : null,
  };
}

function serializeHistory(h: AnalisisPiel360CreditHistoryItem) {
  return {
    id: h.id,
    action: h.action,
    delta: round2(h.delta),
    timestamp: h.timestampMs ? new Date(h.timestampMs).toISOString() : null,
    targetId: h.targetId,
    dstActions: h.dstActions,
  };
}

function summarizeFeatureCosts(skus: AnalisisPiel360FeatureSku[]) {
  const skin = skus.filter((s) =>
    /skin-analysis/i.test(s.runTaskUrl || s.description),
  );
  const fitz = skus.filter((s) =>
    /fitzpatrick/i.test(s.runTaskUrl || s.description),
  );

  const concernCount = ANALISIS_PIEL360_DST_ACTIONS.length;
  const matchingHd = skin.find((s) => {
    const d = s.description.toLowerCase();
    return (
      d.includes('hd') &&
      (d.includes('13') || d.includes('16') || d.includes(`${concernCount}`))
    );
  });

  return {
    skinAnalysis: skin.map((s) => ({
      description: s.description,
      amount: s.amount,
      runTaskUrl: s.runTaskUrl,
    })),
    fitzpatrick: fitz.map((s) => ({
      description: s.description,
      amount: s.amount,
      runTaskUrl: s.runTaskUrl,
    })),
    /** Costo estimado del flujo Piel360 (16 concerns HD + Fitzpatrick). */
    estimatedPerAnalysis: {
      hdUnits: matchingHd?.amount ?? FALLBACK_FEATURE_COSTS.skinAnalysisHdUnits,
      concerns: concernCount,
      fitzpatrickUnits:
        fitz[0]?.amount ?? FALLBACK_FEATURE_COSTS.fitzpatrickUnits,
      combinedUnits:
        (matchingHd?.amount ?? FALLBACK_FEATURE_COSTS.skinAnalysisHdUnits) +
        (fitz[0]?.amount ?? FALLBACK_FEATURE_COSTS.fitzpatrickUnits),
      source: skus.length > 0 ? ('api' as const) : ('fallback' as const),
    },
  };
}
