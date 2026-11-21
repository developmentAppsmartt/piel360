import type { AnalysisDetail } from "@/lib/queries/analyses";
import type { Analysis } from "@/lib/queries/patients";
import { buildComparisonRows, comparisonOverallScore, type ComparisonCategoryRow } from "@piel360/shared";
import {
  parseAnalisisPiel360Metrics,
  type AnalisisPiel360RawResponse,
} from "@/lib/youcam-metrics";

// Las filas viven en shared: el PDF comparativo del API arma las mismas.
export { improvementLabel, splitComparisonRowId, type ComparisonCategoryRow } from "@piel360/shared";

export type ComparisonMode = "aesthetic" | "derm";

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

export type AnalysisKind = "aesthetic" | "derm" | "fitzpatrick";

/** El tipo de un análisis, también cuando salió inválido (el filtro del
 * historial los cuenta en su tipo). */
export function analysisKind(a: AnalysisKindRow): AnalysisKind {
  if (a.fitzpatrickTaskId) return "fitzpatrick";
  if (a.analisisPiel360TaskId) return "aesthetic";
  return "derm";
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

/** Una fila por categoría y, debajo de Arrugas y Poros, una por zona. */
export function buildComparisonCategories(
  initial: Analysis | undefined,
  current: Analysis | undefined,
): ComparisonCategoryRow[] {
  return buildComparisonRows(initial?.aiRawResponse, current?.aiRawResponse);
}

export function analisisPiel360OverallFromAnalysis(
  analysis: Analysis | undefined,
): number | null {
  if (!analysis?.aiRawResponse) return null;
  return comparisonOverallScore(analysis.aiRawResponse);
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
