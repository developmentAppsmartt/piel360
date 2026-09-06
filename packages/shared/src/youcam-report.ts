/**
 * Cálculos puros del reporte YouCam (puntajes, banda, tipo de piel) — antes
 * vivían solo en `apps/web/src/lib/youcam-metrics.ts`. Se promueven acá para
 * que `apps/api` los pueda usar al generar el PDF del reporte (ver
 * `apps/api/src/reports/report-pdf.service.ts`) sin duplicar la lógica; el
 * archivo original en `apps/web` queda como re-export de este.
 */

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
    uiScore: typeof item.ui_score === "number" ? item.ui_score : null,
    rawScore: typeof item.raw_score === "number" ? item.raw_score : null,
    score: typeof item.score === "number" ? item.score : null,
    skinType: typeof item.skin_type === "string" ? item.skin_type : null,
  }));
}

export function youcamOverallScore(metrics: YoucamMetric[]): number | null {
  return metrics.find((m) => m.type === "all")?.score ?? null;
}

export function youcamSkinAge(metrics: YoucamMetric[]): number | null {
  return metrics.find((m) => m.type === "skin_age")?.score ?? null;
}

export function youcamSkinType(metrics: YoucamMetric[]): string | null {
  const item = metrics.find((m) => m.type === "hd_skin_type");
  return item?.skinType ?? null;
}

/** Score preferido para UI: uiScore → score → rawScore (default), o
 * rawScore → score → uiScore si el usuario prefiere ver el valor sin
 * ajustar cosméticamente (ver toggle "Puntuación ajustada"/"Puntuación real"
 * en youcam-results-section.tsx). */
export function youcamMetricValue(metric: YoucamMetric, preferRaw = false): number | null {
  if (preferRaw) return metric.rawScore ?? metric.score ?? metric.uiScore;
  return metric.uiScore ?? metric.score ?? metric.rawScore;
}

export type YoucamScoreBand = "regular" | "promedio" | "buena";

export function youcamScoreBand(score: number): YoucamScoreBand {
  if (score < 70) return "regular";
  if (score < 90) return "promedio";
  return "buena";
}

export function youcamScoreBandLabel(band: YoucamScoreBand): string {
  if (band === "regular") return "Regular";
  if (band === "promedio") return "Promedio";
  return "Buena";
}

/** Métricas principales para carrusel / progreso / radar. */
export const YOUCAM_MAIN_METRIC_TYPES = [
  "hd_wrinkle",
  "hd_age_spot",
  "hd_texture",
  "hd_dark_circle",
  "hd_firmness",
  "hd_pore",
  "hd_droopy_upper_eyelid",
  "hd_droopy_lower_eyelid",
  "hd_acne",
  "hd_radiance",
  "hd_oiliness",
  "hd_moisture",
  "hd_redness",
  "hd_eye_bag",
  "hd_tear_trough",
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
    const preferWhole = !m.region || m.region === "whole";
    if (map[m.type] == null || preferWhole) {
      map[m.type] = value;
    }
  }
  return map;
}

/** diferencia = salud de la piel (años) − edad cronológica. */

export function chronologicalAgeYears(
  birthDate: string | Date | null | undefined,
  atDate: string | Date,
): number | null {
  if (!birthDate) return null;
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const at = atDate instanceof Date ? atDate : new Date(atDate);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return null;
  let age = at.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    at.getMonth() > birth.getMonth() ||
    (at.getMonth() === birth.getMonth() && at.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function skinAgeDifference(
  skinAgeYears: number | null | undefined,
  chronologicalAge: number | null | undefined,
): number | null {
  if (skinAgeYears == null || chronologicalAge == null) return null;
  return Math.round(skinAgeYears) - chronologicalAge;
}

export function skinAgeDifferenceMessage(diff: number): string {
  if (diff < 0) {
    return "La piel se ve mucho más joven que la edad cronológica.";
  }
  if (diff === 0) {
    return "La piel corresponde a la edad cronológica.";
  }
  return "La piel se ve más envejecida que la edad cronológica.";
}

export function formatSignedYears(diff: number): string {
  if (diff > 0) return `+${diff} años`;
  return `${diff} años`;
}

/** Etiquetas usadas por el reporte (radar chart, resumen) — subconjunto de
 * `apps/web/src/lib/youcam-metric-labels.ts` que necesita el PDF server-side. */
export const YOUCAM_METRIC_LABELS: Record<string, string> = {
  hd_redness: "Enrojecimiento",
  hd_oiliness: "Grasa",
  hd_age_spot: "Manchas de edad",
  hd_radiance: "Luminosidad",
  hd_moisture: "Hidratación",
  hd_dark_circle: "Ojeras",
  hd_eye_bag: "Bolsas oculares",
  hd_droopy_upper_eyelid: "Párpado superior caído",
  hd_droopy_lower_eyelid: "Párpado inferior caído",
  hd_firmness: "Firmeza",
  hd_texture: "Textura",
  hd_acne: "Acné",
  hd_pore: "Poros",
  hd_wrinkle: "Arrugas",
  hd_tear_trough: "Surco lagrimal",
  hd_skin_type: "Tipo de piel",
  all: "Puntuación global",
  skin_age: "Edad de la piel",
  patient_age: "Edad del paciente",
  resize_image: "Imagen redimensionada",
};

export const YOUCAM_SKIN_TYPE_LABELS: Record<string, string> = {
  normal: "Normal",
  oily: "Grasa",
  dry: "Seca",
  combination: "Mixta",
  redness: "Enrojecida",
  "dry & redness": "Seca y enrojecida",
  "oily & redness": "Grasa y enrojecida",
  "combination & redness": "Mixta y enrojecida",
};

export function youcamSkinTypeLabel(value: string): string {
  return YOUCAM_SKIN_TYPE_LABELS[value.toLowerCase()] ?? value;
}
