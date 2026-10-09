/** Espejo de `youcam-score-config` en @piel360/shared (GET /auth/me/score-config). */
import { youcamMetricAdvice } from './youcamMetricCopy';
import type { YoucamScoreBand } from '../types/analysis';

export type YoucamMetricScoreConfig = {
  regularMax?: number | null;
  promedioMax?: number | null;
  texts?: Partial<Record<YoucamScoreBand, string | null>>;
};

export type YoucamScoreConfig = {
  metrics: Record<string, YoucamMetricScoreConfig>;
};

export const DEFAULT_YOUCAM_SCORE_CONFIG: YoucamScoreConfig = { metrics: {} };

export function configuredYoucamScoreBand(
  score: number,
  type: string | null | undefined,
  config: YoucamScoreConfig,
): YoucamScoreBand {
  const metric = (type && config.metrics?.[type]) || {};
  if (score < (metric.regularMax ?? 70)) return 'regular';
  if (score < (metric.promedioMax ?? 90)) return 'promedio';
  return 'buena';
}

export function configuredYoucamAdvice(
  type: string | null | undefined,
  band: YoucamScoreBand,
  config: YoucamScoreConfig,
): string {
  const custom = type ? config.metrics?.[type]?.texts?.[band] : null;
  return custom?.trim() ? custom : youcamMetricAdvice(type, band);
}
