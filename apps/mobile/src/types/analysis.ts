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

/** Normaliza `prob` de Skiniver (0–1 o 0–100, number o string) a porcentaje 0–100. */
export function normalizedProb(
  prob: number | string | null | undefined,
): number {
  const n = typeof prob === 'number' ? prob : Number(prob);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? n * 100 : n;
}

/** Formato español de probabilidad de clase (ej. 9,9). */
export function formatClassProbPercent(
  prob: number | string | null | undefined,
): string {
  const pct = normalizedProb(prob);
  return pct.toFixed(1).replace('.', ',');
}

export function parseSkiniverPrediction(
  raw: SkiniverRawResponse | string | null | undefined,
): SkiniverRawResponse | null {
  if (raw == null) return null;
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  // Algunos payloads envuelven la predicción.
  if (
    !('high_risk_prob' in obj) &&
    !('topn' in obj) &&
    !('class' in obj) &&
    obj.prediction &&
    typeof obj.prediction === 'object'
  ) {
    return obj.prediction as SkiniverRawResponse;
  }
  return obj as SkiniverRawResponse;
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

function labelsMatchDiagnosis(label: string, diagnosis: string): boolean {
  const a = label.trim().toLowerCase();
  const b = diagnosis.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** Extrae el % de "Conclusión: 58,9% …" / "58.9% …". */
function conclusionPercent(conclusionText: string | null | undefined): number | null {
  if (!conclusionText?.trim()) return null;
  const m = conclusionText.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Skiniver a menudo copia el `description` del top-1 a otros `topn[]`.
 * Solo aceptamos textos de descripción cuando pertenecen a ESTA clase.
 */
function descriptionBelongsToCandidate(
  parsed: {
    riskEvaluation: string;
    conclusionText: string;
    preciseDiagnosis: string;
    treatment: string;
    advice: string;
  } | null,
  diagnosis: string,
  prob: number,
): boolean {
  if (!parsed) return false;

  const precise = parsed.preciseDiagnosis?.trim();
  if (precise) {
    return labelsMatchDiagnosis(precise, diagnosis);
  }

  const conclPct = conclusionPercent(parsed.conclusionText);
  if (conclPct != null) {
    const itemPct = normalizedProb(prob);
    if (Math.abs(conclPct - itemPct) > 0.55) return false;
  }

  return true;
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
  // class       → diagnóstico (único por ítem de topn)
  // desease     → conclusión / categoría
  // lesion_code → código ICD de ESE ítem (si falta, solo hereda fallback si aplica)
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
    readField(item, [
      'lesion_code',
      'lesionCode',
      'code',
      'icd_code',
      'icdCode',
      'icd',
    ]),
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
  const itemProb = prob ?? 0;
  const ownsDescription = descriptionBelongsToCandidate(
    parsed,
    diagnosis,
    itemProb,
  );
  const preciseRaw = parsed?.preciseDiagnosis?.trim();

  return {
    // Siempre el `class` del propio ítem topn — no usar preciseDiagnosis
    // de `description` (a menudo viene copiado del principal).
    class: diagnosis,
    class_raw: classRaw,
    prob: itemProb,
    risk,
    risk_level: riskLevel,
    desease: conclusion,
    lesion_code: code ?? fallbackCode,
    atlas_page_link: atlas,
    description: ownsDescription ? description : undefined,
    riskEvaluation: ownsDescription
      ? parsed?.riskEvaluation || undefined
      : undefined,
    conclusionText: undefined,
    preciseDiagnosis:
      ownsDescription && preciseRaw && labelsMatchDiagnosis(preciseRaw, diagnosis)
        ? preciseRaw
        : undefined,
    treatment: ownsDescription ? parsed?.treatment || undefined : undefined,
    advice: ownsDescription ? parsed?.advice || undefined : undefined,
  };
}

/**
 * Extrae los diagnósticos de apoyo desde `ai_raw_response.topn[]`
 * mapeando claves reales de Skiniver:
 * - `class` → diagnóstico (por ítem)
 * - `desease` → conclusión / categoría (por ítem)
 * - `lesion_code` → ICD de ese ítem; la raíz solo aplica al principal
 */
export function extractSkiniverSupportDiagnoses(
  raw: SkiniverRawResponse | string | null | undefined,
  limit = 3,
): {
  prediction: SkiniverRawResponse | null;
  riskLabel: string;
  /** `high_risk_prob` normalizado a 0–100 (velocímetro). */
  highRiskProb: number;
  hasHighRiskProb: boolean;
  items: SkiniverDiagnosisCandidate[];
} {
  const prediction = parseSkiniverPrediction(raw);
  if (!prediction) {
    return {
      prediction: null,
      riskLabel: '—',
      highRiskProb: 0,
      hasHighRiskProb: false,
      items: [],
    };
  }

  const root = prediction as Record<string, unknown>;
  const rootCode = asTrimmedString(
    readField(root, [
      'lesion_code',
      'lesionCode',
      'code',
      'icd_code',
      'icdCode',
      'icd',
    ]),
  );
  const rootClass = asTrimmedString(
    readField(root, ['class', 'diagnosis', 'diagnostico']),
  );
  const rootDescription = asTrimmedString(
    readField(root, ['description', 'descripcion']),
  );
  const rootParsed = parseSkiniverDescription(rootDescription);

  const topnRaw = Array.isArray(prediction.topn) ? prediction.topn : [];
  let items = topnRaw
    .map((item) => {
      const rawItem =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : null;
      const itemClass = rawItem
        ? asTrimmedString(
            readField(rawItem, ['class', 'diagnosis', 'diagnostico', 'title', 'name']),
          )
        : undefined;
      // Solo el candidato que coincide con el diagnóstico raíz hereda su ICD.
      const inheritsRootCode =
        !!rootCode &&
        !!rootClass &&
        !!itemClass &&
        itemClass.toLowerCase() === rootClass.toLowerCase();
      return normalizeCandidate(item, inheritsRootCode ? rootCode : undefined);
    })
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

  const rootAtlas = asTrimmedString(
    readField(root, ['atlas_page_link', 'atlas_url']),
  );
  if (items[0] && rootAtlas && !items[0].atlas_page_link) {
    items = items.map((item) =>
      rootClass && item.class.toLowerCase() === rootClass.toLowerCase()
        ? { ...item, atlas_page_link: item.atlas_page_link || rootAtlas }
        : item,
    );
  }

  if (items[0] && rootCode && !items[0].lesion_code) {
    items = items.map((item) =>
      rootClass && item.class.toLowerCase() === rootClass.toLowerCase()
        ? { ...item, lesion_code: rootCode }
        : item,
    );
  }

  // No heredar description/evaluación de la raíz en otros ítems:
  // Skiniver suele repetir el description del top-1 (misma "Evaluación de
  // riesgos") y eso pintaba el mismo párrafo en todos los detalles.
  const rootRiskEval = rootParsed?.riskEvaluation?.trim() || '';
  if (items[0]) {
    items = items.map((item) => {
      const isRoot =
        !!rootClass && item.class.toLowerCase() === rootClass.toLowerCase();
      if (!isRoot) {
        const evalText = item.riskEvaluation?.trim() || '';
        const duplicatedFromRoot =
          !!rootRiskEval && !!evalText && evalText === rootRiskEval;
        return {
          ...item,
          conclusionText: undefined,
          preciseDiagnosis: duplicatedFromRoot
            ? undefined
            : item.preciseDiagnosis,
          description: duplicatedFromRoot ? undefined : item.description,
          riskEvaluation: duplicatedFromRoot ? undefined : item.riskEvaluation,
          treatment: duplicatedFromRoot ? undefined : item.treatment,
          advice: duplicatedFromRoot ? undefined : item.advice,
        };
      }
      if (!rootParsed) return item;
      return {
        ...item,
        description: item.description ?? rootDescription,
        riskEvaluation: item.riskEvaluation || rootParsed.riskEvaluation,
        // No copiar conclusionText con "% categoría" del description raíz;
        // la UI arma la conclusión con item.prob + item.desease.
        conclusionText: undefined,
        preciseDiagnosis: item.preciseDiagnosis || rootParsed.preciseDiagnosis,
        treatment: item.treatment || rootParsed.treatment,
        advice: item.advice || rootParsed.advice,
        lesion_code: item.lesion_code || rootCode,
      };
    });
  }

  const highRiskRaw = asFiniteNumber(
    readField(root, [
      'high_risk_prob',
      'highRiskProb',
      'high_risk_probability',
      'highRiskProbability',
    ]),
  );
  // Escala unificada 0–100 para el velocímetro (Skiniver a veces manda 0–1).
  const highRiskProb =
    highRiskRaw == null
      ? 0
      : highRiskRaw <= 1
        ? highRiskRaw * 100
        : highRiskRaw;

  return {
    prediction,
    riskLabel: asTrimmedString(
      readField(root, ['risk', 'riesgo', 'risk_level', 'riskLevel']),
    ) ?? '—',
    /** Porcentaje 0–100 de `high_risk_prob` (indicador de riesgo general). */
    highRiskProb,
    /** `true` si el JSON traía `high_risk_prob` (evita confundir con `prob` de clase). */
    hasHighRiskProb: highRiskRaw != null,
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
  xCoord?: number | null;
  yCoord?: number | null;
  zCoord?: number | null;
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
    gender?: string | null;
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
