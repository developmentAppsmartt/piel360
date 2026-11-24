import {
  ANALISIS_PIEL360_METRIC_LABELS,
  ANALISIS_PIEL360_OVERALL_TYPE,
  parseScoreConfigKey,
  type AnalisisPiel360MetricScoreConfig,
  type SkinTypeTextZone,
} from "@piel360/shared";
import { analisisPiel360RegionLabel } from "@/lib/youcam-metric-labels";

export const CARD_CLASS =
  "rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export function metricLabel(type: string) {
  if (type === ANALISIS_PIEL360_OVERALL_TYPE) return "Puntaje general";
  return ANALISIS_PIEL360_METRIC_LABELS[type] ?? type;
}

/** «Arrugas» o «Arrugas › Frente». */
export function scoreConfigKeyLabel(key: string) {
  const { type, region } = parseScoreConfigKey(key);
  return region ? `${metricLabel(type)} › ${analisisPiel360RegionLabel(region)}` : metricLabel(type);
}

export function isCustomized(metric: AnalisisPiel360MetricScoreConfig | undefined) {
  return !!metric && Object.keys(metric).length > 0;
}

/** Claves de la navegación que no son métricas: textos sin puntaje. */
export const SKIN_TYPE_KEY = "biotipo";
export const FITZPATRICK_KEY = "fototipo";

export const SKIN_TYPE_ZONE_LABELS: Record<SkinTypeTextZone, string> = {
  whole: "Cara completa",
  t_zone: "Zona T",
  u_zone: "Zona U",
};

/** Algún texto de biotipo o de fototipo cambiado. */
export function hasDescriptiveTexts(texts: object | undefined): boolean {
  return !!texts && Object.values(texts).some((value): boolean =>
    value && typeof value === "object" ? hasDescriptiveTexts(value) : typeof value === "string",
  );
}
