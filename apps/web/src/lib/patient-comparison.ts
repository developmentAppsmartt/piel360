import type { AnalysisDetail } from "@/lib/queries/analyses";
import type { Analysis } from "@/lib/queries/patients";
import { YOUCAM_METRIC_LABELS } from "@/lib/youcam-metric-labels";
import {
  parseYoucamMetrics,
  YOUCAM_MAIN_METRIC_TYPES,
  youcamOverallScore,
  youcamScoresByType,
  type YoucamRawResponse,
} from "@/lib/youcam-metrics";

export type ComparisonMode = "aesthetic" | "derm";

export type ComparisonCategoryRow = {
  id: string;
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

export function isAestheticAnalysis(a: Analysis): boolean {
  return !!a.youcamTaskId && a.isValid !== false;
}

export function isDermatologicalAnalysis(a: Analysis): boolean {
  const fitzpatrick = (a as Analysis & { fitzpatrickTaskId?: string | null })
    .fitzpatrickTaskId;
  return !a.youcamTaskId && !fitzpatrick;
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

export function buildComparisonCategories(
  initial: Analysis | undefined,
  current: Analysis | undefined,
): ComparisonCategoryRow[] {
  const initialScores = youcamScoresByType(
    parseYoucamMetrics(initial?.aiRawResponse as YoucamRawResponse | undefined),
  );
  const currentScores = youcamScoresByType(
    parseYoucamMetrics(current?.aiRawResponse as YoucamRawResponse | undefined),
  );

  return YOUCAM_MAIN_METRIC_TYPES.filter(
    (type) => initialScores[type] != null || currentScores[type] != null,
  ).map((type) => {
    const initialScore = Math.round(initialScores[type] ?? 0);
    const currentScore = Math.round(currentScores[type] ?? 0);
    const improvement = currentScore - initialScore;
    return {
      id: type,
      label: YOUCAM_METRIC_LABELS[type] ?? type,
      initialScore,
      currentScore,
      improvement,
      improvementLabel: improvementLabel(improvement),
    };
  });
}

export function youcamOverallFromAnalysis(
  analysis: Analysis | undefined,
): number | null {
  if (!analysis?.aiRawResponse) return null;
  return youcamOverallScore(
    parseYoucamMetrics(analysis.aiRawResponse as YoucamRawResponse),
  );
}

const DEFAULT_REGION = "whole";

/** Misma lógica que youcam-results-section: máscara por tipo + región. */
export function findYoucamMaskUrl(
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

/** Imagen de la métrica priorizando la región general (`whole`). */
export function youcamMetricMaskUrl(
  detail: AnalysisDetail | undefined,
  metricType: string,
): string | null {
  if (!detail?.masks?.length) return null;

  const metrics = parseYoucamMetrics(
    detail.aiRawResponse as YoucamRawResponse | undefined,
  );
  const candidates = metrics.filter((m) => m.type === metricType);

  if (candidates.length > 0) {
    const whole =
      candidates.find((m) => !m.region || m.region === DEFAULT_REGION) ??
      candidates[0];
    const url = findYoucamMaskUrl(detail.masks, metricType, whole.region);
    if (url) return url;
  }

  return findYoucamMaskUrl(detail.masks, metricType, DEFAULT_REGION);
}

export function analysisPreviewUrl(
  detail: AnalysisDetail | undefined,
): string | null {
  if (!detail) return null;
  if (detail.hasOriginalPhoto && detail.imageUrl) return detail.imageUrl;
  return detail.coloredUrl ?? detail.imageUrl ?? detail.maskedUrl ?? null;
}
