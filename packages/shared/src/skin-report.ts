/**
 * Contrato y reglas del módulo de Reportes del panel del doctor
 * (apps/api/src/doctor-reports + apps/web/src/components/reports).
 *
 * Vive en shared para que la API y el front usen las mismas bandas, umbrales,
 * categorías y tipos de respuesta en vez de duplicarlos (a diferencia de
 * admin-reports.ts, que redefine sus tipos del lado del cliente).
 *
 * Ojo: en TODAS las métricas de YouCam más alto = mejor (100 = piel sana), así
 * que "problemas" / "necesidades prioritarias" son los puntajes MÁS BAJOS.
 */

// ─── Bandas de puntaje ──────────────────────────────────────────────────────

export type SkinReportBand = "excelente" | "bueno" | "regular" | "malo";

export interface SkinReportBandDef {
  key: SkinReportBand;
  label: string;
  /** Inclusive. */
  min: number;
  /** Inclusive. */
  max: number;
  color: string;
}

/**
 * Cuatro bandas del reporte. Los cortes en 70 y 90 son los mismos de
 * `youcamScoreBand()` (youcam-report.ts) — esto solo parte su banda "regular"
 * (<70) en "regular" (50-69) y "malo" (0-49), así que las dos funciones nunca
 * se contradicen.
 *
 * IMPORTANTE: estos cortes están duplicados en los FILTER de
 * apps/api/src/doctor-reports/doctor-reports.queries.ts (no se pueden
 * parametrizar sin ensuciar los planes de consulta). Si cambian acá, cambiarlos
 * también allá.
 */
export const SKIN_REPORT_BANDS: readonly SkinReportBandDef[] = [
  { key: "excelente", label: "Excelente", min: 90, max: 100, color: "#22c55e" },
  { key: "bueno", label: "Bueno", min: 70, max: 89, color: "#84cc16" },
  { key: "regular", label: "Regular", min: 50, max: 69, color: "#facc15" },
  { key: "malo", label: "Malo", min: 0, max: 49, color: "#ef4444" },
] as const;

export function skinReportBand(score: number): SkinReportBand {
  if (score >= 90) return "excelente";
  if (score >= 70) return "bueno";
  if (score >= 50) return "regular";
  return "malo";
}

export function skinReportBandLabel(band: SkinReportBand): string {
  return SKIN_REPORT_BANDS.find((b) => b.key === band)?.label ?? band;
}

export function skinReportBandColor(band: SkinReportBand): string {
  return SKIN_REPORT_BANDS.find((b) => b.key === band)?.color ?? "#71717a";
}

// ─── Umbrales derivados ─────────────────────────────────────────────────────

/** Por debajo de esto una categoría se considera crítica. */
export const SKIN_CRITICAL_MAX_SCORE = 50;
/** Por debajo de esto una categoría requiere seguimiento ("paciente afectado"). */
export const SKIN_FOLLOWUP_MAX_SCORE = 70;

/** Crítico: el paciente tiene alguna categoría por debajo de 50. */
export function isCriticalScore(score: number): boolean {
  return score < SKIN_CRITICAL_MAX_SCORE;
}

/** Candidato a protocolo: su peor categoría cae entre 50 y 69. */
export function isProtocolCandidateScore(score: number): boolean {
  return score >= SKIN_CRITICAL_MAX_SCORE && score < SKIN_FOLLOWUP_MAX_SCORE;
}

export function needsFollowUpScore(score: number): boolean {
  return score < SKIN_FOLLOWUP_MAX_SCORE;
}

// ─── Catálogo de categorías reportables ─────────────────────────────────────

export interface ReportableSkinCategory {
  /** `hd_moisture` o `hd_wrinkle:forehead`. */
  key: string;
  type: string;
  /** null = usar la fila general (region 'whole' o sin región). */
  region: string | null;
  label: string;
}

/**
 * Las categorías que muestra el reporte. Difiere del catálogo crudo de YouCam
 * en tres puntos, todos deliberados:
 *
 * 1. Las regiones de `hd_wrinkle` (frente, entrecejo, patas de gallo…) son
 *    categorías de primer nivel, porque es como las presenta el reporte. Por eso
 *    `hd_wrinkle` NO aparece como categoría general: saldría duplicada con sus
 *    propias regiones en el ranking.
 * 2. `hd_firmness` se etiqueta "Firmeza", no "Flacidez": el score alto es mejor,
 *    así que "Flacidez 98" se leería justo al revés.
 * 3. `hd_skin_type` queda fuera (es categórica, sin puntaje numérico).
 *
 * Las etiquetas son propias del reporte y no reusan YOUCAM_METRIC_LABELS porque
 * el wording difiere ("Lagrimal" vs "Surco lagrimal", "Pigmentación" vs
 * "Manchas de edad", "Oleosidad" vs "Grasa").
 */
export const REPORTABLE_SKIN_CATEGORIES: readonly ReportableSkinCategory[] = [
  { key: "hd_moisture", type: "hd_moisture", region: null, label: "Hidratación" },
  { key: "hd_oiliness", type: "hd_oiliness", region: null, label: "Oleosidad" },
  { key: "hd_acne", type: "hd_acne", region: null, label: "Acné" },
  { key: "hd_pore", type: "hd_pore", region: null, label: "Poros" },
  { key: "hd_texture", type: "hd_texture", region: null, label: "Textura" },
  { key: "hd_redness", type: "hd_redness", region: null, label: "Enrojecimiento" },
  { key: "hd_age_spot", type: "hd_age_spot", region: null, label: "Pigmentación" },
  { key: "hd_radiance", type: "hd_radiance", region: null, label: "Luminosidad" },
  { key: "hd_dark_circle", type: "hd_dark_circle", region: null, label: "Ojeras" },
  { key: "hd_eye_bag", type: "hd_eye_bag", region: null, label: "Bolsas oculares" },
  {
    key: "hd_droopy_upper_eyelid",
    type: "hd_droopy_upper_eyelid",
    region: null,
    label: "Párpado superior caído",
  },
  {
    key: "hd_droopy_lower_eyelid",
    type: "hd_droopy_lower_eyelid",
    region: null,
    label: "Párpado inferior caído",
  },
  { key: "hd_tear_trough", type: "hd_tear_trough", region: null, label: "Lagrimal" },
  { key: "hd_firmness", type: "hd_firmness", region: null, label: "Firmeza" },
  {
    key: "hd_wrinkle:forehead",
    type: "hd_wrinkle",
    region: "forehead",
    label: "Líneas frontales",
  },
  {
    key: "hd_wrinkle:glabellar",
    type: "hd_wrinkle",
    region: "glabellar",
    label: "Líneas glabelares",
  },
  {
    key: "hd_wrinkle:crowfeet",
    type: "hd_wrinkle",
    region: "crowfeet",
    label: "Patas de gallo",
  },
  {
    key: "hd_wrinkle:periocular",
    type: "hd_wrinkle",
    region: "periocular",
    label: "Contorno de ojos",
  },
  {
    key: "hd_wrinkle:nasolabial",
    type: "hd_wrinkle",
    region: "nasolabial",
    label: "Pliegues nasolabiales",
  },
  {
    key: "hd_wrinkle:marionette",
    type: "hd_wrinkle",
    region: "marionette",
    label: "Líneas de marioneta",
  },
] as const;

export function reportableCategoryKey(type: string, region: string | null): string {
  return region ? `${type}:${region}` : type;
}

export function reportableCategoryLabel(key: string): string {
  return REPORTABLE_SKIN_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/**
 * Arrays paralelos para el `unnest(types, regions)` de las consultas.
 * Región `""` significa "usa la fila general" (`is_general` en la vista).
 */
export function reportableCategorySqlPairs(): { types: string[]; regions: string[] } {
  return {
    types: REPORTABLE_SKIN_CATEGORIES.map((c) => c.type),
    regions: REPORTABLE_SKIN_CATEGORIES.map((c) => c.region ?? ""),
  };
}

// ─── Contrato de respuesta ──────────────────────────────────────────────────

export interface ReportDelta {
  current: number | null;
  previous: number | null;
  /** current − previous. null si falta alguno de los dos. */
  delta: number | null;
  /** Variación porcentual. null cuando `previous` es 0 o null (el front pinta "—"). */
  deltaPct: number | null;
}

export interface SkinReportCategoryHighlight {
  key: string;
  label: string;
  avgScore: number;
}

export interface SkinReportDistributionSlice {
  band: SkinReportBand;
  label: string;
  color: string;
  count: number;
  /** 0-100. */
  pct: number;
}

export interface SkinReportTrendPoint {
  /** "YYYY-MM". */
  period: string;
  avgScore: number | null;
  analyses: number;
}

export interface SkinReportCategory {
  key: string;
  type: string;
  region: string | null;
  label: string;
  avgScore: number | null;
  avgScorePrevious: number | null;
  /** Pacientes con al menos una medición de esta categoría en el periodo. */
  patients: number;
  /** Pacientes con algún puntaje < 70 en esta categoría. */
  patientsAffected: number;
  /** 0-100. */
  affectedPct: number;
  /** 0-100 — pacientes cuyo puntaje en esta categoría cae entre 50 y 69. */
  candidatePct: number;
  /** Número de mediciones (filas) que respaldan el promedio. */
  samples: number;
  /** Puntos de la ventana de tendencia (último − primero con datos). */
  trendDelta: number | null;
  trend: { period: string; avgScore: number | null }[];
}

export interface SkinHealthReport {
  range: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    trendMonths: number;
  };
  kpis: {
    patientsAnalyzed: ReportDelta;
    analyses: ReportDelta;
    averageScore: ReportDelta;
    averageSkinAge: ReportDelta;
    /** Años; negativo = piel más joven que la edad cronológica. */
    skinAgeDifference: ReportDelta;
    /** 0-100. */
    criticalPatientsPct: ReportDelta;
    /** 0-100. */
    protocolCandidatesPct: ReportDelta;
    /** Denominador de los dos porcentajes anteriores: pacientes con métricas. */
    metricPatients: number;
    worstCategory: SkinReportCategoryHighlight | null;
    bestCategory: SkinReportCategoryHighlight | null;
  };
  distribution: SkinReportDistributionSlice[];
  distributionTotal: number;
  scoreTrend: SkinReportTrendPoint[];
  /** Ordenadas ascendente por avgScore: la cabeza son las necesidades prioritarias. */
  categories: SkinReportCategory[];
}
