import {
  ANALISIS_PIEL360_METRIC_LABELS,
  ANALISIS_PIEL360_OVERALL_TYPE,
  parseScoreConfigKey,
  type AnalisisPiel360MetricScoreConfig,
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
