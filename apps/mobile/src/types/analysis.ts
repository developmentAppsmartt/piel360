export type PatientAnalysisSummary = {
  id: string;
  bodyRegion: string | null;
  aiDiagnosis: string | null;
  finalDiagnosis?: string | null;
  aiProbability?: number | null;
  isConfirmed?: boolean;
  isValid?: boolean;
  sharedWithPatient?: boolean;
  sharedAt?: string | null;
  youcamTaskId?: string | null;
  imagePath?: string;
  imageUrl?: string | null;
  coloredUrl?: string | null;
  createdAt: string;
  /** Presente en el listado crudo del API; útil para scores YouCam. */
  aiRawResponse?: YoucamRawResponse | SkiniverRawResponse | null;
};

export type YoucamOutputItem = {
  type: string;
  region?: string;
  ui_score?: number;
  raw_score?: number;
  score?: number;
  skin_type?: string;
  mask_urls?: string[];
  [key: string]: unknown;
};

export type YoucamRawResponse = {
  output?: YoucamOutputItem[];
  error?: boolean;
  message?: string;
};

export type SkiniverDiagnosisCandidate = {
  class: string;
  prob: number;
  risk: string;
  risk_level?: 'low' | 'medium' | 'high' | string;
  desease?: string;
  atlas_page_link?: string;
};

export type SkiniverRawResponse = {
  class?: string;
  prob?: number;
  risk?: string;
  high_risk_prob?: number;
  topn?: SkiniverDiagnosisCandidate[];
  error?: string;
  [key: string]: unknown;
};

export function normalizedProb(prob: number): number {
  return prob <= 1 ? prob * 100 : prob;
}

export function parseSkiniverPrediction(
  raw: SkiniverRawResponse | null | undefined,
): SkiniverRawResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw;
}

export type AnalysisMask = {
  type: string;
  region?: string;
  url: string;
};

export type AnalysisDetail = {
  id: string;
  patientId: string;
  youcamTaskId: string | null;
  bodyRegion: string | null;
  isValid: boolean;
  isConfirmed: boolean;
  isCorrected?: boolean;
  sharedWithPatient?: boolean;
  sharedAt?: string | null;
  aiDiagnosis: string | null;
  finalDiagnosis: string | null;
  aiProbability: number | null;
  doctorNotes: string | null;
  imageUrl: string | null;
  coloredUrl: string | null;
  maskedUrl: string | null;
  hasOriginalPhoto: boolean;
  masks: AnalysisMask[];
  aiRawResponse: YoucamRawResponse | SkiniverRawResponse | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type YoucamMetric = {
  type: string;
  region?: string;
  uiScore: number | null;
  rawScore: number | null;
  score: number | null;
  skinType: string | null;
};

/** Extrae métricas YouCam desde aiRawResponse.output[]. */
export function parseYoucamMetrics(
  raw: YoucamRawResponse | null | undefined,
): YoucamMetric[] {
  if (!raw?.output?.length) return [];
  return raw.output.map((item) => ({
    type: item.type,
    region: item.region,
    uiScore: typeof item.ui_score === 'number' ? item.ui_score : null,
    rawScore: typeof item.raw_score === 'number' ? item.raw_score : null,
    score: typeof item.score === 'number' ? item.score : null,
    skinType: typeof item.skin_type === 'string' ? item.skin_type : null,
  }));
}

export function youcamOverallScore(
  metrics: YoucamMetric[],
): number | null {
  return metrics.find((m) => m.type === 'all')?.score ?? null;
}

export function youcamSkinAge(metrics: YoucamMetric[]): number | null {
  return metrics.find((m) => m.type === 'skin_age')?.score ?? null;
}

export function youcamSkinType(metrics: YoucamMetric[]): string | null {
  const item = metrics.find((m) => m.type === 'hd_skin_type');
  return item?.skinType ?? null;
}

/** Score preferido para UI: uiScore → score → rawScore. */
export function youcamMetricValue(metric: YoucamMetric): number | null {
  return metric.uiScore ?? metric.score ?? metric.rawScore;
}

export type YoucamScoreBand = 'regular' | 'promedio' | 'buena';

export function youcamScoreBand(score: number): YoucamScoreBand {
  if (score < 70) return 'regular';
  if (score < 90) return 'promedio';
  return 'buena';
}

export function youcamScoreBandLabel(band: YoucamScoreBand): string {
  if (band === 'regular') return 'Regular';
  if (band === 'promedio') return 'Promedio';
  return 'Buena';
}

/** Métricas principales para carrusel / progreso / radar (sin regiones). */
export const YOUCAM_MAIN_METRIC_TYPES = [
  'hd_wrinkle',
  'hd_age_spot',
  'hd_texture',
  'hd_dark_circle',
  'hd_firmness',
  'hd_pore',
  'hd_droopy_upper_eyelid',
  'hd_droopy_lower_eyelid',
  'hd_acne',
  'hd_radiance',
  'hd_oiliness',
  'hd_moisture',
  'hd_redness',
  'hd_eye_bag',
  'hd_tear_trough',
] as const;

/** Agrupa por type eligiendo región whole/sin región cuando exista. */
export function youcamScoresByType(
  metrics: YoucamMetric[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const m of metrics) {
    const value = youcamMetricValue(m);
    if (value == null) continue;
    const preferWhole = !m.region || m.region === 'whole';
    if (map[m.type] == null || preferWhole) {
      map[m.type] = value;
    }
  }
  return map;
}
