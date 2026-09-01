import { Injectable, Logger } from '@nestjs/common';
import { YOUCAM_DST_ACTIONS } from '@piel360/shared';
import {
  YouCamService,
  type PerfectCorpCreditBalance,
  type PerfectCorpCreditHistoryItem,
  type PerfectCorpFeatureSku,
} from '../youcam/youcam.service';

const EXPIRING_SOON_MS = 30 * 24 * 60 * 60 * 1000;

/** Costo documentado Perfect Corp cuando el endpoint feature-cost no responde. */
const FALLBACK_FEATURE_COSTS = {
  skinAnalysisHdConcerns: YOUCAM_DST_ACTIONS.length,
  skinAnalysisHdUnits: 22,
  fitzpatrickUnits: 10,
} as const;

@Injectable()
export class PerfectCorpUnitsService {
  private readonly logger = new Logger(PerfectCorpUnitsService.name);

  constructor(private readonly youcam: YouCamService) {}

  /**
   * Bolsa estética / Fitzpatrick = misma cuenta Perfect Corp (unidades
   * compartidas). Dermatológico (Skiniver) no usa este saldo.
   */
  async getAestheticUnitPool() {
    const [balances, skus, history] = await Promise.all([
      this.youcam.getCreditBalances(),
      this.youcam.getFeatureCosts().catch((err) => {
        this.logger.warn(
          `feature-cost no disponible: ${err instanceof Error ? err.message : String(err)}`,
        );
        return [] as PerfectCorpFeatureSku[];
      }),
      this.youcam.getCreditHistory(30).catch((err) => {
        this.logger.warn(
          `credit/history no disponible: ${err instanceof Error ? err.message : String(err)}`,
        );
        return [] as PerfectCorpCreditHistoryItem[];
      }),
    ]);

    const available = balances.reduce((sum, b) => sum + b.amount, 0);
    const now = Date.now();
    const expiringSoon = balances
      .filter(
        (b) =>
          b.expiryMs != null &&
          b.expiryMs > now &&
          b.expiryMs - now <= EXPIRING_SOON_MS,
      )
      .reduce((sum, b) => sum + b.amount, 0);

    const consumedFromHistory = history
      .filter((h) => h.delta < 0)
      .reduce((sum, h) => sum + Math.abs(h.delta), 0);

    const rechargedFromHistory = history
      .filter((h) => h.delta > 0)
      .reduce((sum, h) => sum + h.delta, 0);

    return {
      source: 'perfectcorp' as const,
      fetchedAt: new Date().toISOString(),
      pool: {
        id: 'aesthetic' as const,
        name: 'Análisis estéticos / Fitzpatrick',
        accent: 'aesthetic' as const,
        available: round2(available),
        /** Aprox. desde historial reciente + saldo actual. */
        total: round2(available + consumedFromHistory),
        used: round2(consumedFromHistory),
        reserved: 0,
        expiringSoon: round2(expiringSoon),
        unitLabel: 'unidades' as const,
        rechargedRecent: round2(rechargedFromHistory),
      },
      balances: balances.map(serializeBalance),
      featureCosts: summarizeFeatureCosts(skus),
      history: history.map(serializeHistory),
    };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function serializeBalance(b: PerfectCorpCreditBalance) {
  return {
    id: b.id,
    type: b.type,
    amount: round2(b.amount),
    expiry: b.expiryMs ? new Date(b.expiryMs).toISOString() : null,
  };
}

function serializeHistory(h: PerfectCorpCreditHistoryItem) {
  return {
    id: h.id,
    action: h.action,
    delta: round2(h.delta),
    timestamp: h.timestampMs
      ? new Date(h.timestampMs).toISOString()
      : null,
    targetId: h.targetId,
    dstActions: h.dstActions,
  };
}

function summarizeFeatureCosts(skus: PerfectCorpFeatureSku[]) {
  const skin = skus.filter((s) =>
    /skin-analysis/i.test(s.runTaskUrl || s.description),
  );
  const fitz = skus.filter((s) =>
    /fitzpatrick/i.test(s.runTaskUrl || s.description),
  );

  const concernCount = YOUCAM_DST_ACTIONS.length;
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
      youcamHdUnits:
        matchingHd?.amount ?? FALLBACK_FEATURE_COSTS.skinAnalysisHdUnits,
      youcamConcerns: concernCount,
      fitzpatrickUnits:
        fitz[0]?.amount ?? FALLBACK_FEATURE_COSTS.fitzpatrickUnits,
      combinedUnits:
        (matchingHd?.amount ?? FALLBACK_FEATURE_COSTS.skinAnalysisHdUnits) +
        (fitz[0]?.amount ?? FALLBACK_FEATURE_COSTS.fitzpatrickUnits),
      source: skus.length > 0 ? ('api' as const) : ('fallback' as const),
    },
  };
}
