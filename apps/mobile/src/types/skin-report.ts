/** Espejo de packages/shared skin-report (mobile no importa el paquete). */

export type SkinReportBand = 'excelente' | 'bueno' | 'regular' | 'malo';

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

export type SkiniverReport = {
  range: { from: string; to: string };
  byClass: SkiniverMonthlySeriesPoint[];
  byDisease: SkiniverMonthlySeriesPoint[];
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

export const SKINIVER_DISEASE_SERIES = [
  { key: 'acne', label: 'Acné', color: '#f97316' },
  { key: 'dermatitis', label: 'Dermatitis', color: '#3b82f6' },
  { key: 'melasma', label: 'Melasma', color: '#a855f7' },
  { key: 'rosacea', label: 'Rosácea', color: '#ec4899' },
  { key: 'psoriasis', label: 'Psoriasis', color: '#ef4444' },
  { key: 'eccema', label: 'Eccema', color: '#14b8a6' },
  { key: 'tinia', label: 'Tiña', color: '#eab308' },
  { key: 'verrugas', label: 'Verrugas', color: '#6366f1' },
  { key: 'urticaria', label: 'Urticaria', color: '#0ea5e9' },
  { key: 'otras', label: 'Otras', color: '#94a3b8' },
] as const;

export const SKINIVER_AGE_SERIES = [
  { key: '0-17', label: '0 - 17 años', color: '#22c55e' },
  { key: '18-25', label: '18 - 25 años', color: '#3b82f6' },
  { key: '26-35', label: '26 - 35 años', color: '#a855f7' },
  { key: '36-45', label: '36 - 45 años', color: '#f97316' },
  { key: '46-55', label: '46 - 55 años', color: '#ef4444' },
  { key: '56+', label: '56+ años', color: '#94a3b8' },
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
