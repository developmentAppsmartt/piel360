import {
  ANALISIS_PIEL360_MAIN_METRIC_TYPES,
  ANALISIS_PIEL360_METRIC_LABELS,
  analisisPiel360MetricValue,
  analisisPiel360OverallScore,
  analisisPiel360ScoresByType,
  parseAnalisisPiel360Metrics,
  type AnalisisPiel360Metric,
  type AnalisisPiel360RawResponse,
} from "./youcam-report.js";

/** Zonas de la cara que el análisis estético mide por separado. */
export const ANALISIS_PIEL360_REGION_LABELS: Record<string, string> = {
  whole: "Cara completa",
  forehead: "Frente",
  nose: "Nariz",
  cheek: "Mejillas",
  glabellar: "Entrecejo",
  crowfeet: "Patas de gallo",
  periocular: "Contorno de ojos",
  nasolabial: "Nasolabial",
  marionette: "Marioneta",
  t_zone: "Zona T",
  u_zone: "Zona U",
};

export function analisisPiel360RegionLabel(region: string): string {
  return ANALISIS_PIEL360_REGION_LABELS[region] ?? region;
}

/** Una fila de la comparación estética (pantalla y PDF). */
export type ComparisonCategoryRow = {
  /** `hd_wrinkle`, o `hd_wrinkle:forehead` en las filas de zona. */
  id: string;
  label: string;
  /** Solo en las filas de zona: la categoría a la que pertenecen. */
  parentId?: string;
  initialScore: number;
  currentScore: number;
  improvement: number;
  improvementLabel: string;
};

export function improvementLabel(delta: number): string {
  if (delta >= 20) return "Mejora significativa";
  if (delta >= 10) return "Mejora notable";
  if (delta > 0) return "Mejora moderada";
  if (delta === 0) return "Sin cambio";
  return "Empeoró";
}

/** Las métricas que el análisis estético mide además por zona de la cara. */
const METRICS_WITH_ZONES = new Set(["hd_wrinkle", "hd_pore"]);
const REGION_ORDER = Object.keys(ANALISIS_PIEL360_REGION_LABELS);

function scoresByRegion(metrics: AnalisisPiel360Metric[], type: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const m of metrics) {
    if (m.type !== type || !m.region || m.region === "whole") continue;
    const value = analisisPiel360MetricValue(m);
    if (value != null) map[m.region] = value;
  }
  return map;
}

function comparisonRow(
  base: Pick<ComparisonCategoryRow, "id" | "label" | "parentId">,
  initial: number | undefined,
  current: number | undefined,
): ComparisonCategoryRow {
  const initialScore = Math.round(initial ?? 0);
  const currentScore = Math.round(current ?? 0);
  const improvement = currentScore - initialScore;
  return { ...base, initialScore, currentScore, improvement, improvementLabel: improvementLabel(improvement) };
}

function metricsOf(raw: unknown) {
  return parseAnalisisPiel360Metrics((raw ?? undefined) as AnalisisPiel360RawResponse | undefined);
}

/** Una fila por categoría y, debajo de Arrugas y Poros, una por zona. Recibe
 * el `aiRawResponse` de cada análisis. */
export function buildComparisonRows(initialRaw: unknown, currentRaw: unknown): ComparisonCategoryRow[] {
  const initialMetrics = metricsOf(initialRaw);
  const currentMetrics = metricsOf(currentRaw);
  const initialScores = analisisPiel360ScoresByType(initialMetrics);
  const currentScores = analisisPiel360ScoresByType(currentMetrics);

  return ANALISIS_PIEL360_MAIN_METRIC_TYPES.filter(
    (type) => initialScores[type] != null || currentScores[type] != null,
  ).flatMap((type) => {
    const row = comparisonRow(
      { id: type, label: ANALISIS_PIEL360_METRIC_LABELS[type] ?? type },
      initialScores[type],
      currentScores[type],
    );
    if (!METRICS_WITH_ZONES.has(type)) return [row];

    const initialZones = scoresByRegion(initialMetrics, type);
    const currentZones = scoresByRegion(currentMetrics, type);
    const regions = REGION_ORDER.filter((r) => initialZones[r] != null || currentZones[r] != null);
    return [
      row,
      ...regions.map((region) =>
        comparisonRow(
          { id: `${type}:${region}`, label: analisisPiel360RegionLabel(region), parentId: type },
          initialZones[region],
          currentZones[region],
        ),
      ),
    ];
  });
}

/** Puntaje general de un análisis estético a partir de su `aiRawResponse`. */
export function comparisonOverallScore(raw: unknown): number | null {
  return analisisPiel360OverallScore(metricsOf(raw));
}

/** `hd_wrinkle:forehead` → tipo y zona. */
export function splitComparisonRowId(id: string): { type: string; region: string | null } {
  const [type = id, region] = id.split(":");
  return { type, region: region ?? null };
}
