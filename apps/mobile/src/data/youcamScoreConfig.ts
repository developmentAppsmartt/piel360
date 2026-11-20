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

/** Clave de la puntuación general (igual que ANALISIS_PIEL360_OVERALL_TYPE). */
export const YOUCAM_OVERALL_TYPE = 'all';

export type RangosPuntaje = { regularMax: number; promedioMax: number };

const DEFAULT_RANGES: RangosPuntaje = { regularMax: 70, promedioMax: 90 };

/** Subcategorías con rangos y textos propios (`hd_wrinkle:forehead`). */
const SCORE_SUBCATEGORIES: Record<string, readonly string[]> = {
  hd_wrinkle: [
    'forehead',
    'glabellar',
    'crowfeet',
    'periocular',
    'nasolabial',
    'marionette',
  ],
  hd_pore: ['forehead', 'nose', 'cheek'],
};

export function scoreConfigKey(
  type: string,
  region?: string | null,
): string {
  const r = region?.trim().toLowerCase() || null;
  if (r && SCORE_SUBCATEGORIES[type]?.includes(r)) {
    return `${type}:${r}`;
  }
  return type;
}

/** Normaliza la respuesta del API por si viene anidada o sin `metrics`. */
export function normalizeYoucamScoreConfig(raw: unknown): YoucamScoreConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_YOUCAM_SCORE_CONFIG;
  const obj = raw as Record<string, unknown>;
  const metrics =
    obj.metrics && typeof obj.metrics === 'object'
      ? (obj.metrics as Record<string, YoucamMetricScoreConfig>)
      : null;
  if (metrics) return { metrics };
  // Por si el cuerpo ya es el mapa de métricas.
  const keys = Object.keys(obj);
  if (
    keys.some(
      (k) =>
        k === YOUCAM_OVERALL_TYPE ||
        k.startsWith('hd_') ||
        k.includes(':'),
    )
  ) {
    return { metrics: obj as Record<string, YoucamMetricScoreConfig> };
  }
  return DEFAULT_YOUCAM_SCORE_CONFIG;
}

/** Lo configurado que aplica: la subcategoría y luego su métrica. */
function configEntries(
  config: YoucamScoreConfig | null | undefined,
  type: string | null | undefined,
  region?: string | null,
): YoucamMetricScoreConfig[] {
  if (!type) return [];
  const metrics = config?.metrics ?? {};
  const key = scoreConfigKey(type, region);
  const sub = key !== type ? metrics[key] : undefined;
  const parent = metrics[type];
  return [sub, parent].filter(
    (entry): entry is YoucamMetricScoreConfig => !!entry,
  );
}

export function resolveYoucamScoreRanges(
  config: YoucamScoreConfig | null | undefined,
  type: string | null | undefined,
  region?: string | null,
): RangosPuntaje {
  const entries = configEntries(config, type, region);
  return {
    regularMax:
      entries.find((e) => e.regularMax != null)?.regularMax ??
      DEFAULT_RANGES.regularMax,
    promedioMax:
      entries.find((e) => e.promedioMax != null)?.promedioMax ??
      DEFAULT_RANGES.promedioMax,
  };
}

/** Rangos de la puntuación general (`metrics.all`). */
export function rangosGenerales(
  config: YoucamScoreConfig | null | undefined,
): RangosPuntaje {
  return resolveYoucamScoreRanges(config, YOUCAM_OVERALL_TYPE);
}

export function configuredYoucamScoreBand(
  score: number,
  type: string | null | undefined,
  config: YoucamScoreConfig | null | undefined,
  region?: string | null,
): YoucamScoreBand {
  const { regularMax, promedioMax } = resolveYoucamScoreRanges(
    config,
    type,
    region,
  );
  if (score < regularMax) return 'regular';
  if (score < promedioMax) return 'promedio';
  return 'buena';
}

export function configuredYoucamAdvice(
  type: string | null | undefined,
  band: YoucamScoreBand,
  config: YoucamScoreConfig | null | undefined,
  region?: string | null,
): string {
  const custom = configEntries(config, type, region)
    .map((entry) => entry.texts?.[band])
    .find((text) => typeof text === 'string' && text.trim().length > 0);
  return custom?.trim() ?? youcamMetricAdvice(type, band);
}
