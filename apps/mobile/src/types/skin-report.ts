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
