import {
  REPORTABLE_SKIN_CATEGORIES,
  SKIN_REPORT_BANDS,
  reportableCategoryKey,
  type ReportDelta,
  type SkinHealthReport,
  type SkinReportCategory,
  type SkinReportTrendPoint,
} from '@piel360/shared';
import type {
  CategoryRow,
  CategoryTrendRow,
  DerivedKpiRow,
  SummaryRow,
  TrendRow,
} from './doctor-reports.queries';
import { DAY_MS, monthKeys, toIsoDate, type ReportRange } from './report-range';

/** Mínimo de mediciones para que una categoría pueda destacarse como mejor/peor. */
const HIGHLIGHT_MIN_SAMPLES = 3;

function delta(current: number | null, previous: number | null): ReportDelta {
  const diff = current != null && previous != null ? current - previous : null;
  // Sin base previa no hay variación porcentual que mostrar (el front pinta "—"
  // en vez de un "+∞%").
  const pct =
    diff != null && previous != null && previous !== 0
      ? (diff / Math.abs(previous)) * 100
      : null;
  return { current, previous, delta: diff, deltaPct: pct };
}

function pct(part: number, total: number): number | null {
  return total > 0 ? (part / total) * 100 : null;
}

export interface SkinHealthRows {
  summaryRows: SummaryRow[];
  trendRows: TrendRow[];
  categoryRows: CategoryRow[];
  categoryTrendRows: CategoryTrendRow[];
  derivedRows: DerivedKpiRow[];
}

/**
 * Arma el reporte de salud de la piel a partir de las filas de las consultas:
 * distribución por banda, serie global, categorías y KPIs con su variación
 * frente al periodo anterior. Separado de DoctorReportsService, que se queda
 * con el alcance y las consultas.
 */
export function buildSkinHealthReport(
  rows: SkinHealthRows,
  range: ReportRange,
): SkinHealthReport {
  const {
    summaryRows,
    trendRows,
    categoryRows,
    categoryTrendRows,
    derivedRows,
  } = rows;
  const { from, to, prevFrom, trendMonths } = range;

  const summary: SummaryRow = summaryRows[0] ?? {
    analyses_current: 0,
    analyses_previous: 0,
    patients_current: 0,
    patients_previous: 0,
    avg_score_current: null,
    avg_score_previous: null,
    avg_skin_age_current: null,
    avg_skin_age_previous: null,
    avg_age_diff_current: null,
    avg_age_diff_previous: null,
    band_excelente: 0,
    band_bueno: 0,
    band_regular: 0,
    band_malo: 0,
    band_total: 0,
  };
  const derived: DerivedKpiRow = derivedRows[0] ?? {
    patients_current: 0,
    patients_previous: 0,
    critical_current: 0,
    critical_previous: 0,
    candidate_current: 0,
    candidate_previous: 0,
  };

  // ── Distribución ────────────────────────────────────────────────────────
  const bandCounts: Record<string, number> = {
    excelente: summary.band_excelente,
    bueno: summary.band_bueno,
    regular: summary.band_regular,
    malo: summary.band_malo,
  };
  const distributionTotal = summary.band_total;
  const distribution = SKIN_REPORT_BANDS.map((band) => {
    const count = bandCounts[band.key] ?? 0;
    return {
      band: band.key,
      label: band.label,
      color: band.color,
      count,
      pct: distributionTotal > 0 ? (count / distributionTotal) * 100 : 0,
    };
  });

  // ── Serie global (rellena los meses sin datos) ──────────────────────────
  const trendByPeriod = new Map(trendRows.map((row) => [row.period, row]));
  const scoreTrend: SkinReportTrendPoint[] = monthKeys(to, trendMonths).map(
    (period) => ({
      period,
      avgScore: trendByPeriod.get(period)?.avg_score ?? null,
      analyses: trendByPeriod.get(period)?.analyses ?? 0,
    }),
  );

  // ── Categorías ──────────────────────────────────────────────────────────
  const periods = monthKeys(to, trendMonths);
  const trendByCategory = new Map<string, Map<string, number | null>>();
  for (const row of categoryTrendRows) {
    const key = reportableCategoryKey(row.type, row.region);
    const inner = trendByCategory.get(key) ?? new Map<string, number | null>();
    inner.set(row.period, row.avg_score);
    trendByCategory.set(key, inner);
  }

  const categories: SkinReportCategory[] = categoryRows.map((row) => {
    const key = reportableCategoryKey(row.type, row.region);
    const def = REPORTABLE_SKIN_CATEGORIES.find((c) => c.key === key);
    const series = trendByCategory.get(key);
    const trend = periods.map((period) => ({
      period,
      avgScore: series?.get(period) ?? null,
    }));
    const withData = trend.filter((p) => p.avgScore != null);
    const trendDelta =
      withData.length >= 2
        ? (withData[withData.length - 1].avgScore as number) -
          (withData[0].avgScore as number)
        : null;

    return {
      key,
      type: row.type,
      region: row.region,
      label: def?.label ?? key,
      avgScore: row.avg_current,
      avgScorePrevious: row.avg_previous,
      patients: row.patients_current,
      patientsAffected: row.patients_affected,
      affectedPct: pct(row.patients_affected, row.patients_current) ?? 0,
      candidatePct: pct(row.patients_candidate, row.patients_current) ?? 0,
      samples: row.samples_current,
      trendDelta,
      trend,
    };
  });

  // Mejor/peor: extremos del ranking, exigiendo un mínimo de mediciones para
  // no destacar una categoría respaldada por un solo análisis.
  const eligible = categories.filter(
    (c) => c.avgScore != null && c.samples >= HIGHLIGHT_MIN_SAMPLES,
  );
  const worst = eligible[0];
  const best = eligible[eligible.length - 1];

  return {
    range: {
      from: toIsoDate(from),
      to: toIsoDate(to),
      previousFrom: toIsoDate(prevFrom),
      previousTo: toIsoDate(new Date(from.getTime() - DAY_MS)),
      trendMonths,
    },
    kpis: {
      patientsAnalyzed: delta(
        summary.patients_current,
        summary.patients_previous,
      ),
      analyses: delta(summary.analyses_current, summary.analyses_previous),
      averageScore: delta(
        summary.avg_score_current,
        summary.avg_score_previous,
      ),
      averageSkinAge: delta(
        summary.avg_skin_age_current,
        summary.avg_skin_age_previous,
      ),
      skinAgeDifference: delta(
        summary.avg_age_diff_current,
        summary.avg_age_diff_previous,
      ),
      criticalPatientsPct: delta(
        pct(derived.critical_current, derived.patients_current),
        pct(derived.critical_previous, derived.patients_previous),
      ),
      protocolCandidatesPct: delta(
        pct(derived.candidate_current, derived.patients_current),
        pct(derived.candidate_previous, derived.patients_previous),
      ),
      metricPatients: derived.patients_current,
      worstCategory: worst
        ? {
            key: worst.key,
            label: worst.label,
            avgScore: worst.avgScore as number,
          }
        : null,
      bestCategory: best
        ? {
            key: best.key,
            label: best.label,
            avgScore: best.avgScore as number,
          }
        : null,
    },
    distribution,
    distributionTotal,
    scoreTrend,
    categories,
  };
}
