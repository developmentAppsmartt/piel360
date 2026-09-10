import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  REPORTABLE_SKIN_CATEGORIES,
  SKIN_REPORT_BANDS,
  reportableCategoryKey,
  reportableCategorySqlPairs,
  type ReportDelta,
  type SkinHealthReport,
  type SkinReportCategory,
  type SkinReportTrendPoint,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import type { SkinHealthReportQueryDto } from './dto/skin-health-report-query.dto';
import {
  categoryRankingQuery,
  categoryTrendQuery,
  derivedKpiQuery,
  scoreTrendQuery,
  summaryQuery,
  type CategoryRow,
  type CategoryTrendRow,
  type DerivedKpiRow,
  type SummaryRow,
  type TrendRow,
} from './doctor-reports.queries';

const DEFAULT_RANGE_DAYS = 30;
const DEFAULT_TREND_MONTHS = 6;
/** Mínimo de mediciones para que una categoría pueda destacarse como mejor/peor. */
const HIGHLIGHT_MIN_SAMPLES = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function delta(current: number | null, previous: number | null): ReportDelta {
  const diff =
    current != null && previous != null ? current - previous : null;
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

/** Lista de "YYYY-MM" de los últimos `months` meses, terminando en el de `end`. */
function monthKeys(end: Date, months: number): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1),
    );
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/**
 * Reportes analíticos del panel del doctor. Solo cubre análisis **YouCam**:
 * `analysis_results` únicamente se llena para ese proveedor (Skiniver deja
 * `ai_diagnosis`, Fitzpatrick escribe `Patient.fitzpatrickType`), y así lo
 * declaran las vistas que consumen las consultas.
 *
 * Un solo endpoint devuelve el bundle completo: las tres pantallas comparten
 * filtros, y partirlo obligaría a repetir el scope (1-2 queries de contexto)
 * en cada request. Las agregaciones van en Promise.all.
 */
@Injectable()
export class DoctorReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
  ) {}

  /** Mismo contrato que PatientsService: solo el owner filtra por profesional. */
  private async resolveDoctorIds(
    userId: string,
    professionalUserId?: string,
  ): Promise<string[]> {
    const scope = await this.orgContext.resolvePatientDoctorScope(userId);
    this.orgContext.assertTeamPermission(scope.ctx, 'reports');

    if (!professionalUserId) {
      return scope.visibleDoctorIds.map((id) => id.toString());
    }

    if (!scope.ctx.isOrgOwner) {
      throw new ForbiddenException(
        'Solo el dueño del equipo puede filtrar por profesional',
      );
    }
    const professional = scope.professionals.find(
      (item) => item.userId === professionalUserId,
    );
    if (!professional) {
      throw new BadRequestException('Profesional no encontrado en tu equipo');
    }
    return [professional.doctorId];
  }

  private resolveRange(query: SkinHealthReportQueryDto) {
    const today = startOfUtcDay(new Date());
    const to = query.to ? startOfUtcDay(new Date(query.to)) : today;
    const from = query.from
      ? startOfUtcDay(new Date(query.from))
      : new Date(to.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Rango de fechas inválido');
    }
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la final',
      );
    }

    // Semiabierto: incluye todo el último día sin depender de la hora.
    const toExclusive = new Date(to.getTime() + DAY_MS);
    const span = toExclusive.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - span);

    return {
      from,
      to,
      toExclusive,
      prevFrom,
      trendMonths: query.trendMonths ?? DEFAULT_TREND_MONTHS,
    };
  }

  async getSkinHealthReport(
    userId: string,
    query: SkinHealthReportQueryDto,
  ): Promise<SkinHealthReport> {
    const doctorIds = await this.resolveDoctorIds(
      userId,
      query.professionalUserId,
    );
    const { from, to, toExclusive, prevFrom, trendMonths } =
      this.resolveRange(query);
    const { types, regions } = reportableCategorySqlPairs();

    const empty = doctorIds.length === 0;
    const [summaryRows, trendRows, categoryRows, categoryTrendRows, derivedRows] =
      empty
        ? [[], [], [], [], []]
        : await Promise.all([
            this.prisma.$queryRaw<SummaryRow[]>(
              summaryQuery(doctorIds, from, toExclusive, prevFrom),
            ),
            this.prisma.$queryRaw<TrendRow[]>(
              scoreTrendQuery(doctorIds, toExclusive, trendMonths),
            ),
            this.prisma.$queryRaw<CategoryRow[]>(
              categoryRankingQuery(
                doctorIds,
                from,
                toExclusive,
                prevFrom,
                types,
                regions,
              ),
            ),
            this.prisma.$queryRaw<CategoryTrendRow[]>(
              categoryTrendQuery(
                doctorIds,
                toExclusive,
                trendMonths,
                types,
                regions,
              ),
            ),
            this.prisma.$queryRaw<DerivedKpiRow[]>(
              derivedKpiQuery(
                doctorIds,
                from,
                toExclusive,
                prevFrom,
                types,
                regions,
              ),
            ),
          ]);

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
      const inner = trendByCategory.get(key) ?? new Map();
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
          ? { key: worst.key, label: worst.label, avgScore: worst.avgScore as number }
          : null,
        bestCategory: best
          ? { key: best.key, label: best.label, avgScore: best.avgScore as number }
          : null,
      },
      distribution,
      distributionTotal,
      scoreTrend,
      categories,
    };
  }
}
