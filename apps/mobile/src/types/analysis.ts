export type PatientAnalysisSummary = {
  id: string;
  bodyRegion: string | null;
  aiDiagnosis: string | null;
  finalDiagnosis?: string | null;
  aiProbability?: number | null;
  isConfirmed?: boolean;
  isCorrected?: boolean;
  isValid?: boolean;
  sharedWithPatient?: boolean;
  sharedAt?: string | null;
  youcamTaskId?: string | null;
  fitzpatrickTaskId?: string | null;
  imagePath?: string;
  imageUrl?: string | null;
  coloredUrl?: string | null;
  createdAt: string;
  provider?: { displayLabel: string | null } | null;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  /** Presente en el listado crudo del API; útil para scores YouCam / Fitzpatrick. */
  aiRawResponse?:
    | YoucamRawResponse
    | SkiniverRawResponse
    | FitzpatrickRawResponse
    | null;
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
  /** Diagnóstico (ej. "Nevus displásico") ← `class`. */
  class: string;
  /** Identificador interno Skiniver (ej. "2P_dysplastic_nevus") ← `class_raw`. */
  class_raw?: string;
  prob: number;
  risk: string;
  risk_level?: 'low' | 'medium' | 'high' | string;
  /** Conclusión / categoría (ej. "Condiciones precancerosas") ← `desease`. */
  desease?: string;
  atlas_page_link?: string;
  /** Código ICD (ej. "D22") ← `lesion_code` (suele venir en la raíz). */
  lesion_code?: string;
  description?: string;
  /** Campos derivados del texto libre `description`. */
  riskEvaluation?: string;
  conclusionText?: string;
  preciseDiagnosis?: string;
  treatment?: string;
  advice?: string;
};

export type SkiniverRawResponse = {
  class?: string;
  class_raw?: string;
  prob?: number | string;
  risk?: string;
  risk_level?: string;
  high_risk_prob?: number;
  topn?: SkiniverDiagnosisCandidate[];
  lesion_code?: string;
  desease?: string;
  description?: string;
  atlas_page_link?: string;
  error?: string | null;
  [key: string]: unknown;
};

/** Resultado de GET task Fitzpatrick (packages/shared FitzpatrickResult). */
export type FitzpatrickRawResponse = {
  fitzpatrick_scale?: string;
  timed?: number;
  error?: boolean;
  message?: string;
  [key: string]: unknown;
};

export function normalizedProb(prob: number): number {
  return prob <= 1 ? prob * 100 : prob;
}

export function parseSkiniverPrediction(
  raw: SkiniverRawResponse | string | null | undefined,
): SkiniverRawResponse | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as SkiniverRawResponse;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof raw !== 'object') return null;
  return raw;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Parsea el texto libre de `description` de Skiniver (formato real):
 *
 *   Evaluación del riesgo|de riesgos: <párrafo>
 *    Conclusión:
 *   <prob>% <categoría>
 *
 *   Diagnóstico[ preciso]: <texto>
 *   Tratamiento: <texto>
 *   Consejo: <texto>
 */
export function parseSkiniverDescription(
  description: string | null | undefined,
): {
  riskEvaluation: string;
  conclusionText: string;
  preciseDiagnosis: string;
  treatment: string;
  advice: string;
} | null {
  if (!description?.trim()) return null;

  const riskEvaluation =
    description
      .match(
        /Evaluaci[oó]n\s+del?\s+riesgos?:\s*([\s\S]*?)(?=\n\s*Conclusi[oó]n:)/i,
      )?.[1]
      ?.trim() ?? '';
  const conclusionText =
    description
      .match(
        /Conclusi[oó]n:\s*([\s\S]*?)(?=\n\s*Diagn[oó]stico)/i,
      )?.[1]
      ?.trim() ?? '';
  const preciseDiagnosis =
    description
      .match(/Diagn[oó]stico(?:\s+preciso)?:\s*([^\n]+)/i)?.[1]
      ?.trim() ?? '';
  const treatment =
    description.match(/Tratamiento:\s*([^\n]+)/i)?.[1]?.trim() ?? '';
  const advice = description.match(/Consejo:\s*([^\n]+)/i)?.[1]?.trim() ?? '';

  if (
    !riskEvaluation &&
    !conclusionText &&
    !preciseDiagnosis &&
    !treatment &&
    !advice
  ) {
    return null;
  }

  return {
    riskEvaluation,
    conclusionText,
    preciseDiagnosis,
    treatment,
    advice,
  };
}

function readField(
  source: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (source[key] != null && source[key] !== '') return source[key];
  }
  return undefined;
}

function normalizeCandidate(
  rawItem: unknown,
  fallbackCode?: string,
): SkiniverDiagnosisCandidate | null {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const item = rawItem as Record<string, unknown>;

  // Clave → valor (JSON Skiniver real)
  // class       → diagnóstico
  // desease     → conclusión / categoría
  // lesion_code → código ICD (raíz; topn no lo trae)
  // class_raw   → id interno
  // description → evaluación / diagnóstico preciso / tratamiento / consejo
  const diagnosis = asTrimmedString(
    readField(item, ['class', 'diagnosis', 'diagnostico', 'title', 'name']),
  );
  if (!diagnosis) return null;

  const conclusion = asTrimmedString(
    readField(item, ['desease', 'disease', 'conclusion', 'category']),
  );
  const code = asTrimmedString(
    readField(item, ['lesion_code', 'code', 'icd_code', 'icd']),
  );
  const classRaw = asTrimmedString(
    readField(item, ['class_raw', 'classRaw']),
  );
  const prob = asFiniteNumber(readField(item, ['prob', 'probability', 'score']));
  const risk = asTrimmedString(readField(item, ['risk', 'riesgo'])) ?? '—';
  const riskLevel = asTrimmedString(
    readField(item, ['risk_level', 'riskLevel']),
  );
  const atlas = asTrimmedString(
    readField(item, ['atlas_page_link', 'atlas_url']),
  );
  const description = asTrimmedString(
    readField(item, ['description', 'descripcion']),
  );
  const parsed = parseSkiniverDescription(description);

  return {
    class: diagnosis,
    class_raw: classRaw,
    prob: prob ?? 0,
    risk,
    risk_level: riskLevel,
    desease: conclusion,
    lesion_code: code ?? fallbackCode,
    atlas_page_link: atlas,
    description,
    riskEvaluation: parsed?.riskEvaluation || undefined,
    conclusionText: parsed?.conclusionText || undefined,
    preciseDiagnosis: parsed?.preciseDiagnosis || undefined,
    treatment: parsed?.treatment || undefined,
    advice: parsed?.advice || undefined,
  };
}

/**
 * Extrae los diagnósticos de apoyo desde `ai_raw_response.topn[]`
 * mapeando claves reales de Skiniver:
 * - `class` → diagnóstico
 * - `desease` → conclusión
 * - `lesion_code` (raíz) → código del resultado principal
 */
export function extractSkiniverSupportDiagnoses(
  raw: SkiniverRawResponse | string | null | undefined,
  limit = 3,
): {
  prediction: SkiniverRawResponse | null;
  riskLabel: string;
  highRiskProb: number;
  items: SkiniverDiagnosisCandidate[];
} {
  const prediction = parseSkiniverPrediction(raw);
  if (!prediction) {
    return { prediction: null, riskLabel: '—', highRiskProb: 0, items: [] };
  }

  const root = prediction as Record<string, unknown>;
  const rootCode = asTrimmedString(
    readField(root, ['lesion_code', 'code', 'icd_code', 'icd']),
  );
  const rootDescription = asTrimmedString(
    readField(root, ['description', 'descripcion']),
  );
  const rootParsed = parseSkiniverDescription(rootDescription);

  const topnRaw = Array.isArray(prediction.topn) ? prediction.topn : [];
  let items = topnRaw
    .map((item, index) =>
      // Solo el 1.er topn hereda lesion_code de la raíz (D22 en el ejemplo).
      normalizeCandidate(item, index === 0 ? rootCode : undefined),
    )
    .filter((item): item is SkiniverDiagnosisCandidate => item != null);

  if (items.length === 0) {
    const fallback = normalizeCandidate(
      {
        class: prediction.class,
        class_raw: prediction.class_raw,
        prob: prediction.prob,
        risk: prediction.risk,
        risk_level: prediction.risk_level,
        desease: prediction.desease,
        lesion_code: rootCode,
        description: rootDescription,
        atlas_page_link: prediction.atlas_page_link,
      },
      rootCode,
    );
    items = fallback ? [fallback] : [];
  }

  // Si el 1.er topn ya trae preciseDiagnosis, igual asegura lesion_code raíz.
  if (items[0] && rootCode && !items[0].lesion_code) {
    items = items.map((item, index) =>
      index === 0 ? { ...item, lesion_code: rootCode } : item,
    );
  }

  if (items[0] && rootParsed && !items[0].preciseDiagnosis) {
    items = items.map((item, index) =>
      index === 0
        ? {
            ...item,
            description: item.description ?? rootDescription,
            riskEvaluation: item.riskEvaluation || rootParsed.riskEvaluation,
            conclusionText: item.conclusionText || rootParsed.conclusionText,
            preciseDiagnosis:
              item.preciseDiagnosis || rootParsed.preciseDiagnosis,
            treatment: item.treatment || rootParsed.treatment,
            advice: item.advice || rootParsed.advice,
            lesion_code: item.lesion_code || rootCode,
          }
        : item,
    );
  }

  const highRiskRaw = asFiniteNumber(prediction.high_risk_prob) ?? 0;

  return {
    prediction,
    riskLabel: asTrimmedString(prediction.risk) ?? '—',
    highRiskProb: highRiskRaw,
    items: items.slice(0, Math.max(1, limit)),
  };
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
  fitzpatrickTaskId?: string | null;
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
  aiRawResponse:
    | YoucamRawResponse
    | SkiniverRawResponse
    | FitzpatrickRawResponse
    | null;
  createdAt: string;
  updatedAt: string;
  skinAgeYears?: number | null;
  chronologicalAgeYears?: number | null;
  skinAgeDifference?: number | null;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    skinType?: string | null;
    fitzpatrickType?: string | null;
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
  const preferred =
    metrics.find(
      (m) =>
        m.type === 'hd_skin_type' &&
        m.skinType &&
        (!m.region || m.region === 'whole'),
    ) ?? metrics.find((m) => m.type === 'hd_skin_type' && m.skinType);
  return preferred?.skinType ?? null;
}

/** Score preferido para UI: uiScore → score → rawScore (default), o
 * rawScore → score → uiScore si el usuario prefiere el valor sin ajustar. */
export function youcamMetricValue(
  metric: YoucamMetric,
  preferRaw = false,
): number | null {
  if (preferRaw) return metric.rawScore ?? metric.score ?? metric.uiScore;
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
  preferRaw = false,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const m of metrics) {
    const value = youcamMetricValue(m, preferRaw);
    if (value == null) continue;
    const preferWhole = !m.region || m.region === 'whole';
    if (map[m.type] == null || preferWhole) {
      map[m.type] = value;
    }
  }
  return map;
}
