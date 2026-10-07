/** Espejo de packages/shared skin-report (mobile no importa el paquete). */

export type SkinReportBand = 'excelente' | 'bueno' | 'regular' | 'malo';

/** Mismos cortes y colores que SKIN_REPORT_BANDS de shared. */
const SKIN_REPORT_BAND_COLORS: Record<SkinReportBand, string> = {
  excelente: '#22c55e',
  bueno: '#84cc16',
  regular: '#facc15',
  malo: '#ef4444',
};

export function skinReportBand(score: number): SkinReportBand {
  if (score >= 90) return 'excelente';
  if (score >= 70) return 'bueno';
  if (score >= 50) return 'regular';
  return 'malo';
}

export function skinReportScoreColor(score: number): string {
  return SKIN_REPORT_BAND_COLORS[skinReportBand(score)];
}

export type ReportDelta = {
  current: number | null;
  previous: number | null;
  delta: number | null;
  deltaPct: number | null;
};

export type SkinReportCategoryHighlight = {
  key: string;
  label: string;
  avgScore: number;
};

export type SkinReportDistributionSlice = {
  band: SkinReportBand;
  label: string;
  color: string;
  count: number;
  pct: number;
};

export type SkinReportTrendPoint = {
  period: string;
  avgScore: number | null;
  analyses: number;
};

export type SkinReportCategory = {
  key: string;
  type: string;
  region: string | null;
  label: string;
  avgScore: number | null;
  avgScorePrevious: number | null;
  patients: number;
  patientsAffected: number;
  affectedPct: number;
  candidatePct: number;
  samples: number;
  trendDelta: number | null;
  trend: { period: string; avgScore: number | null }[];
};

export type SkinHealthReport = {
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
    skinAgeDifference: ReportDelta;
    criticalPatientsPct: ReportDelta;
    protocolCandidatesPct: ReportDelta;
    metricPatients: number;
    worstCategory: SkinReportCategoryHighlight | null;
    bestCategory: SkinReportCategoryHighlight | null;
  };
  distribution: SkinReportDistributionSlice[];
  distributionTotal: number;
  scoreTrend: SkinReportTrendPoint[];
  categories: SkinReportCategory[];
};

export type DoctorReportsFilters = {
  from: string;
  to: string;
  trendMonths?: number;
  professionalUserId?: string;
};

export type TopProblemsSort = 'score' | 'affected' | 'trend';

export type LifestyleSegment = {
  key: string;
  label: string;
  patients: number;
  pct: number;
  avgScore: number | null;
  analyses?: number;
};

export type LifestyleReportSection = {
  title: string;
  segments: LifestyleSegment[];
};

export type LifestyleReport = {
  range: { from: string; to: string };
  birthType: LifestyleReportSection;
  pets: LifestyleReportSection;
  activity: LifestyleReportSection;
  clinicalAi: LifestyleReportSection;
};

/** Reporte dermatológico (Skiniver) — espejo de packages/shared SkiniverReport. */
export type SkiniverMonthlySeriesPoint = {
  period: string;
  counts: Record<string, number>;
};

export type SkiniverSkinToneBucket = {
  key: string;
  label: string;
  color: string;
  count: number;
  pct: number;
};

export type SkiniverTrendSeriesDef = {
  key: string;
  label: string;
  color: string;
};

/** Porción de una distribución (donut de categorías, barras por edad). */
export type SkiniverCategorySlice = {
  key: string;
  label: string;
  color: string;
  count: number;
  pct: number;
};

export type SkiniverTopDiagnosis = {
  diagnosis: string;
  icdCode: string | null;
  count: number;
  pct: number;
};

export type SkiniverAgeGenderRow = {
  key: string;
  label: string;
  male: number;
  female: number;
  unknown: number;
};

export type SkiniverReport = {
  range: { from: string; to: string };
  /** Diagnósticos con patología del periodo (denominador de donut y top 10). */
  total?: number;
  byCategory?: SkiniverCategorySlice[];
  topDiagnoses?: SkiniverTopDiagnosis[];
  byAgeGender?: SkiniverAgeGenderRow[];
  ageDistribution?: SkiniverCategorySlice[];
  byClass: SkiniverMonthlySeriesPoint[];
  /** Condiciones concretas: Top 8 del periodo + "Otras" — no grupos. */
  byDisease: SkiniverMonthlySeriesPoint[];
  /** Series de `byDisease`: dependen del periodo, por eso no son constantes. */
  diseaseSeries: SkiniverTrendSeriesDef[];
  byAge: SkiniverMonthlySeriesPoint[];
  bySkinTone: SkiniverSkinToneBucket[];
  skinToneTotal: number;
};

export const SKINIVER_CLASS_SERIES = [
  { key: 'inflammatory', label: 'Enfermedades inflamatorias', color: '#f97316' },
  { key: 'infectious', label: 'Enfermedades infecciosas', color: '#3b82f6' },
  { key: 'tumors', label: 'Tumores de la piel', color: '#22c55e' },
  { key: 'annex', label: 'Trastornos de anexos', color: '#a855f7' },
  { key: 'other', label: 'Otras clases', color: '#94a3b8' },
] as const;

export const SKINIVER_AGE_SERIES = [
  { key: '0-12', label: '0 - 12 años', color: '#22c55e' },
  { key: '13-20', label: '13 - 20 años', color: '#14b8a6' },
  { key: '21-30', label: '21 - 30 años', color: '#3b82f6' },
  { key: '31-40', label: '31 - 40 años', color: '#a855f7' },
  { key: '41-50', label: '41 - 50 años', color: '#f97316' },
  { key: '51-60', label: '51 - 60 años', color: '#ef4444' },
  { key: '61+', label: '61+ años', color: '#94a3b8' },
] as const;

export function rangeForDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return {
    from: toIsoDate(from),
    to: toIsoDate(to),
  };
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDeltaValue(
  value: number | null,
  opts?: { decimals?: number; unit?: 'pct' | 'years' | null },
): string {
  if (value == null || Number.isNaN(value)) return '—';
  const decimals = opts?.decimals ?? 0;
  const formatted = value.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (opts?.unit === 'pct') return `${formatted}%`;
  if (opts?.unit === 'years') {
    const sign = value > 0 ? '+' : '';
    return `${sign}${formatted} años`;
  }
  return formatted;
}

export function sortCategories(
  categories: SkinReportCategory[],
  sort: TopProblemsSort,
): SkinReportCategory[] {
  const rows = [...categories];
  if (sort === 'affected') {
    rows.sort((a, b) => b.affectedPct - a.affectedPct);
  } else if (sort === 'trend') {
    rows.sort(
      (a, b) => (a.trendDelta ?? Infinity) - (b.trendDelta ?? Infinity),
    );
  } else {
    rows.sort((a, b) => (a.avgScore ?? Infinity) - (b.avgScore ?? Infinity));
  }
  return rows;
}
