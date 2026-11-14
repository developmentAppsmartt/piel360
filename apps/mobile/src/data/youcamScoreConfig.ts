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

/** Igual que `DEFAULT_SCORE_RANGES` de shared: Regular hasta regularMax − 1. */
export const RANGOS_POR_DEFECTO = { regularMax: 70, promedioMax: 90 } as const;

export type RangosPuntaje = { regularMax: number; promedioMax: number };

export function resolveYoucamScoreRanges(
  config: YoucamScoreConfig,
  type?: string | null,
): RangosPuntaje {
  const metric = (type && config.metrics?.[type]) || {};
  return {
    regularMax: metric.regularMax ?? RANGOS_POR_DEFECTO.regularMax,
    promedioMax: metric.promedioMax ?? RANGOS_POR_DEFECTO.promedioMax,
  };
}

/** La puntuación general no es una métrica de la personalización. Si todas
 * las métricas que el profesional movió comparten los mismos cortes, la
 * barra general usa esos. Si cada una tiene cortes distintos, se quedan
 * los de PIEL 360. */
export function rangosGenerales(config: YoucamScoreConfig): RangosPuntaje {
  const cortes = Object.values(config.metrics)
    .filter((m) => m.regularMax != null || m.promedioMax != null)
    .map((m) => ({
      regularMax: m.regularMax ?? RANGOS_POR_DEFECTO.regularMax,
      promedioMax: m.promedioMax ?? RANGOS_POR_DEFECTO.promedioMax,
    }));
  if (cortes.length === 0) return { ...RANGOS_POR_DEFECTO };
  const primero = cortes[0];
  const iguales = cortes.every(
    (c) =>
      c.regularMax === primero.regularMax &&
      c.promedioMax === primero.promedioMax,
  );
  return iguales ? primero : { ...RANGOS_POR_DEFECTO };
}

export function configuredYoucamScoreBand(
  score: number,
  type: string | null | undefined,
  config: YoucamScoreConfig,
): YoucamScoreBand {
  const { regularMax, promedioMax } = resolveYoucamScoreRanges(config, type);
  if (score < regularMax) return 'regular';
  if (score < promedioMax) return 'promedio';
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
