/** Espejo de `youcam-score-config` en @piel360/shared (GET /auth/me/score-config).
 * Si cambias la herencia allá, cámbiala aquí. */
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

/** Subcategorías con rangos y textos propios (`hd_wrinkle:forehead`); lo que
 * no definan lo heredan de su métrica. */
const SCORE_SUBCATEGORIES: Record<string, readonly string[]> = {
  hd_wrinkle: ['forehead', 'glabellar', 'crowfeet', 'periocular', 'nasolabial', 'marionette'],
  hd_pore: ['forehead', 'nose', 'cheek'],
};

/** Lo configurado que aplica: la subcategoría y luego su métrica. */
function configEntries(
  config: YoucamScoreConfig,
  type: string | null | undefined,
  region?: string | null,
): YoucamMetricScoreConfig[] {
  if (!type) return [];
  const sub =
    region && SCORE_SUBCATEGORIES[type]?.includes(region)
      ? config.metrics?.[`${type}:${region}`]
      : undefined;
  return [sub, config.metrics?.[type]].filter(
    (entry): entry is YoucamMetricScoreConfig => !!entry,
  );
}

export function configuredYoucamScoreBand(
  score: number,
  type: string | null | undefined,
  config: YoucamScoreConfig,
  region?: string | null,
): YoucamScoreBand {
  const entries = configEntries(config, type, region);
  const regularMax = entries.find((e) => e.regularMax != null)?.regularMax ?? 70;
  const promedioMax = entries.find((e) => e.promedioMax != null)?.promedioMax ?? 90;
  if (score < regularMax) return 'regular';
  if (score < promedioMax) return 'promedio';
  return 'buena';
}

export function configuredYoucamAdvice(
  type: string | null | undefined,
  band: YoucamScoreBand,
  config: YoucamScoreConfig,
  region?: string | null,
): string {
  const custom = configEntries(config, type, region)
    .map((entry) => entry.texts?.[band])
    .find((text) => text?.trim());
  return custom ?? youcamMetricAdvice(type, band);
}
