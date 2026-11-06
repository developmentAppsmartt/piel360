import { ANALISIS_PIEL360_SCORE_SUBCATEGORIES } from "@piel360/shared";
import type { AnalysisDetail } from "@/lib/queries/analyses";
import { analisisPiel360MaskLabel } from "@/lib/youcam-metric-labels";
import {
  ANALISIS_PIEL360_MAIN_METRIC_TYPES,
  analisisPiel360MetricValue,
  type AnalisisPiel360Metric,
} from "@/lib/youcam-metrics";

export type ReportMetricRow = {
  key: string;
  type: string;
  /** null en la fila general de la métrica. */
  region: string | null;
  title: string;
  score: number;
  maskUrl: string | null;
};

const isWhole = (region?: string) => !region || region === "whole";

/** La máscara de la región; en la fila general, la de `whole` o la primera
 * de la métrica (mismo criterio que el reporte de la app móvil). */
function maskUrlFor(
  masks: AnalysisDetail["masks"],
  type: string,
  region: string | undefined,
): string | null {
  if (!isWhole(region)) {
    return masks.find((m) => m.type === type && m.region === region)?.url ?? null;
  }
  return (
    masks.find((m) => m.type === type && isWhole(m.region ?? undefined))?.url ??
    masks.find((m) => m.type === type)?.url ??
    null
  );
}

/** Filas de «Detalle por métrica»: la general de cada métrica principal y,
 * en Arrugas y Poros, una por subcategoría con puntaje (las mismas que se
 * configuran aparte en Rangos de puntuación). */
export function buildReportRows(
  metrics: AnalisisPiel360Metric[],
  masks: AnalysisDetail["masks"],
): ReportMetricRow[] {
  const rows: ReportMetricRow[] = [];
  for (const type of ANALISIS_PIEL360_MAIN_METRIC_TYPES) {
    const candidates = metrics.filter((m) => m.type === type);
    const whole = candidates.find((m) => isWhole(m.region)) ?? candidates[0];
    const wholeScore = whole ? analisisPiel360MetricValue(whole) : null;
    if (whole && wholeScore != null) {
      rows.push({
        key: type,
        type,
        region: null,
        title: analisisPiel360MaskLabel(type),
        score: wholeScore,
        maskUrl: maskUrlFor(masks, type, whole.region),
      });
    }
    for (const region of ANALISIS_PIEL360_SCORE_SUBCATEGORIES[type] ?? []) {
      const sub = candidates.find((m) => m.region === region);
      const score = sub ? analisisPiel360MetricValue(sub) : null;
      if (score == null) continue;
      rows.push({
        key: `${type}:${region}`,
        type,
        region,
        title: analisisPiel360MaskLabel(type, region),
        score,
        maskUrl: maskUrlFor(masks, type, region),
      });
    }
  }
  return rows;
}
