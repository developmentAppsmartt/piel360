import type { AnalysisDetail } from "@/lib/queries/analyses";
import type { Analysis } from "@/lib/queries/patients";
import {
  ANALISIS_PIEL360_METRIC_LABELS,
  ANALISIS_PIEL360_REGION_LABELS,
  analisisPiel360RegionLabel,
} from "@/lib/youcam-metric-labels";
import {
  analisisPiel360MetricValue,
  parseAnalisisPiel360Metrics,
  ANALISIS_PIEL360_MAIN_METRIC_TYPES,
  analisisPiel360OverallScore,
  analisisPiel360ScoresByType,
  type AnalisisPiel360Metric,
  type AnalisisPiel360RawResponse,
} from "@/lib/youcam-metrics";

export type ComparisonMode = "aesthetic" | "derm";

export type ComparisonCategoryRow = {
  /** `hd_wrinkle`, o `hd_wrinkle:forehead` en las filas de zona. */
  id: string;
  /** Solo en las filas de zona: la categoría a la que pertenecen. */
  parentId?: string;
  label: string;
  initialScore: number;
  currentScore: number;
  improvement: number;
  improvementLabel: string;
};

export type ComparisonNotes = {
  general: string;
  categories: Record<string, string>;
};

export function comparisonNotesStorageKey(
  patientId: string,
  mode: ComparisonMode,
  initialId: string | null,
  currentId: string | null,
): string {
  return `piel360:comparison-notes:${patientId}:${mode}:${initialId ?? ""}:${currentId ?? ""}`;
}

export function emptyComparisonNotes(): ComparisonNotes {
  return { general: "", categories: {} };
}

/** Lo mínimo para saber de qué tipo es un análisis, para que los predicados
 * sirvan tanto con `Analysis` como con el `AnalysisListItem` de `GET /analyses`. */
type AnalysisKindRow = {
  analisisPiel360TaskId: string | null;
  fitzpatrickTaskId?: string | null;
  isValid?: boolean;
};

export function isAestheticAnalysis(a: AnalysisKindRow): boolean {
  return !!a.analisisPiel360TaskId && a.isValid !== false;
}

export function isDermatologicalAnalysis(a: AnalysisKindRow): boolean {
  return !a.analisisPiel360TaskId && !a.fitzpatrickTaskId;
}

/** Filtro de la tabla de análisis de la ficha del paciente. */
export type AnalysisTypeFilter = "all" | "aesthetic" | "derm" | "fitzpatrick";

export function filterAnalysesByType<T extends AnalysisKindRow>(
  analyses: T[],
  type: AnalysisTypeFilter,
): T[] {
  if (type === "all") return analyses;
  if (type === "aesthetic") return analyses.filter((a) => !!a.analisisPiel360TaskId);
  if (type === "derm") return analyses.filter(isDermatologicalAnalysis);
  return analyses.filter((a) => !!a.fitzpatrickTaskId);
}

export function formatAnalysisDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Con segundos: en la comparación dos análisis del mismo minuto se veían
 * iguales en los selectores de fecha. */
export function formatAnalysisDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatAnalysisDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function filterAnalysesByMode(
  analyses: Analysis[],
  mode: ComparisonMode,
): Analysis[] {
  const filtered = analyses.filter(
    mode === "aesthetic" ? isAestheticAnalysis : isDermatologicalAnalysis,
  );
  return [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Penúltimo = inicial, último = actual (por fecha descendente). */
export function defaultComparisonPair(analyses: Analysis[]): {
  initialId: string | null;
  currentId: string | null;
} {
  if (analyses.length === 0) {
    return { initialId: null, currentId: null };
  }
  if (analyses.length === 1) {
    return { initialId: analyses[0].id, currentId: analyses[0].id };
  }
  return {
    initialId: analyses[1].id,
    currentId: analyses[0].id,
  };
}

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

/** Puntaje de cada zona (sin `whole`) de una métrica. */
function scoresByRegion(metrics: AnalisisPiel360Metric[], type: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const m of metrics) {
    if (m.type !== type || !m.region || m.region === DEFAULT_REGION) continue;
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

function metricsOf(analysis: Analysis | undefined) {
  return parseAnalisisPiel360Metrics(analysis?.aiRawResponse as AnalisisPiel360RawResponse | undefined);
}

/** Una fila por categoría y, debajo de Arrugas y Poros, una por zona. */
export function buildComparisonCategories(
  initial: Analysis | undefined,
  current: Analysis | undefined,
): ComparisonCategoryRow[] {
  const initialMetrics = metricsOf(initial);
  const currentMetrics = metricsOf(current);
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

/** `hd_wrinkle:forehead` → tipo y zona. */
export function splitComparisonRowId(id: string): { type: string; region: string | null } {
  const [type, region] = id.split(":");
  return { type, region: region ?? null };
}

export function analisisPiel360OverallFromAnalysis(
  analysis: Analysis | undefined,
): number | null {
  if (!analysis?.aiRawResponse) return null;
  return analisisPiel360OverallScore(
    parseAnalisisPiel360Metrics(analysis.aiRawResponse as AnalisisPiel360RawResponse),
  );
}

const DEFAULT_REGION = "whole";

/** Misma lógica que analisispiel360-results-section: máscara por tipo + región. */
export function findAnalisisPiel360MaskUrl(
  masks: AnalysisDetail["masks"],
  type: string,
  region?: string | null,
): string | null {
  if (!masks.length) return null;
  const normalized = region ?? DEFAULT_REGION;
  return (
    masks.find((m) => m.type === type && m.region === normalized)?.url ??
    masks.find((m) => m.type === type && m.region === region)?.url ??
    masks.find(
      (m) => m.type === type && (!m.region || m.region === DEFAULT_REGION),
    )?.url ??
    masks.find((m) => m.type === type)?.url ??
    null
  );
}

export function analysisPhotoUrl(
  detail: AnalysisDetail | undefined,
): string | null {
  if (!detail) return null;
  if (detail.hasOriginalPhoto && detail.imageUrl) return detail.imageUrl;
  if (detail.analisisPiel360TaskId) return null;
  return detail.coloredUrl ?? detail.imageUrl ?? detail.maskedUrl ?? null;
}

/** @deprecated Preferir analysisPhotoUrl + máscara superpuesta. */
export function analysisPreviewUrl(
  detail: AnalysisDetail | undefined,
): string | null {
  return analysisPhotoUrl(detail);
}

function maskUrlFromRaw(
  detail: AnalysisDetail,
  type: string,
  region?: string | null,
): string | null {
  const output = (detail.aiRawResponse as AnalisisPiel360RawResponse | undefined)
    ?.output;
  if (!output?.length) return null;
  const normalized = region ?? DEFAULT_REGION;
  const match =
    output.find((item) => item.type === type && item.region === normalized) ??
    output.find(
      (item) =>
        item.type === type && (!item.region || item.region === DEFAULT_REGION),
    ) ??
    output.find((item) => item.type === type);
  const url = match?.mask_urls?.[0];
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** Imagen de la métrica priorizando la región general (`whole`), o la de
 * `zone` si se pide una. */
export function analisisPiel360MetricMaskUrl(
  detail: AnalysisDetail | undefined,
  metricType: string,
  zone?: string | null,
): string | null {
  if (!detail) return null;
  if (zone) {
    return (
      (detail.masks?.length ? findAnalisisPiel360MaskUrl(detail.masks, metricType, zone) : null) ??
      maskUrlFromRaw(detail, metricType, zone)
    );
  }

  const metrics = parseAnalisisPiel360Metrics(
    detail.aiRawResponse as AnalisisPiel360RawResponse | undefined,
  );
  const candidates = metrics.filter((m) => m.type === metricType);
  const whole =
    candidates.find((m) => !m.region || m.region === DEFAULT_REGION) ??
    candidates[0];
  const region = whole?.region ?? DEFAULT_REGION;

  if (detail.masks?.length) {
    const url = findAnalisisPiel360MaskUrl(detail.masks, metricType, region);
    if (url) return url;
  }

  return maskUrlFromRaw(detail, metricType, region);
}
