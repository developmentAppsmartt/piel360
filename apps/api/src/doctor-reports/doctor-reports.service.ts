import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  BIRTH_TYPE_LABELS,
  classifyDiagnosisClass,
  classifyDiseaseBucket,
  EXERCISE_HABIT_LABELS,
  MASCOT_TYPE_LABELS,
  REPORTABLE_SKIN_CATEGORIES,
  SEGMENT_COLORS,
  SKIN_REPORT_BANDS,
  SKIN_TONE_BUCKET_DEFS,
  reportableCategoryKey,
  reportableCategorySqlPairs,
  skinToneBucketForFitzpatrick,
  type ReportDelta,
  type SegmentType,
  type SkinHealthReport,
  type SkinReportCategory,
  type SkinReportSegmentBucket,
  type SkinReportSegmentCategoryComparison,
  type SkinReportSegmentsResponse,
  type SkinReportSegmentView,
  type SkinReportTrendPoint,
  type SkiniverMonthlySeriesPoint,
  type SkiniverReport,
  type SkiniverSkinToneBucket,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import type { SkinHealthReportQueryDto } from './dto/skin-health-report-query.dto';
import type { SkinSegmentsReportQueryDto } from './dto/skin-segments-report-query.dto';
import type { SkiniverReportQueryDto } from './dto/skiniver-report-query.dto';
import {
  categoryRankingQuery,
  categoryTrendQuery,
  derivedKpiQuery,
  scoreTrendQuery,
  segmentCategoryQuery,
  segmentDistributionQuery,
  summaryQuery,
  type CategoryRow,
  type CategoryTrendRow,
  type DerivedKpiRow,
  type SegmentCategoryRow,
  type SegmentColumn,
  type SegmentDistributionRow,
  type SummaryRow,
  type TrendRow,
} from './doctor-reports.queries';
import {
  skiniverAgeMonthlyQuery,
  skiniverMonthlyDiagnosesQuery,
  skiniverSkinToneQuery,
  type SkiniverAgeRow,
  type SkiniverDiagnosisRow,
  type SkiniverSkinToneRow,
} from './skiniver-reports.queries';

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

/** Lista de "YYYY-MM" de los últimos `months` meses, terminando en el de `end`. */
function monthKeys(end: Date, months: number): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1),
    );
    keys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }
  return keys;
}

/** Lista de "YYYY-MM" entre `from` y `to` (inclusivos), un mes por entrada.
 * A diferencia de monthKeys() (últimos N meses terminando en `end`), este
 * cubre exactamente el rango de fechas filtrado por el usuario — lo que
 * necesita el reporte de Skiniver, sin una ventana de tendencia aparte. */
function monthKeysInRange(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1),
  );
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    keys.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
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

  private resolveRange(query: {
    from?: string;
    to?: string;
    trendMonths?: number;
  }) {
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
    const [
      summaryRows,
      trendRows,
      categoryRows,
      categoryTrendRows,
      derivedRows,
    ] = empty
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

  /**
   * Reportes segmentados (tipo de nacimiento, mascota, actividad física):
   * comparan el mismo overall_score del reporte principal, partido por un
   * dato demográfico de Patient. Un solo endpoint para los 3, mismo criterio
   * que getSkinHealthReport (comparten scope y filtros).
   */
  async getSkinSegmentsReport(
    userId: string,
    query: SkinSegmentsReportQueryDto,
  ): Promise<SkinReportSegmentsResponse> {
    const doctorIds = await this.resolveDoctorIds(
      userId,
      query.professionalUserId,
    );
    const { from, to, toExclusive } = this.resolveRange(query);
    const { types, regions } = reportableCategorySqlPairs();

    const segmentDefs: {
      column: SegmentColumn;
      type: SegmentType;
      labels: Record<string, string>;
    }[] = [
      { column: 'birth_type', type: 'birthType', labels: BIRTH_TYPE_LABELS },
      { column: 'mascot_type', type: 'mascotType', labels: MASCOT_TYPE_LABELS },
      {
        column: 'exercise_habit',
        type: 'exerciseHabit',
        labels: EXERCISE_HABIT_LABELS,
      },
    ];

    const empty = doctorIds.length === 0;
    const results = empty
      ? segmentDefs.map(() => ({
          dist: [] as SegmentDistributionRow[],
          cat: [] as SegmentCategoryRow[],
        }))
      : await Promise.all(
          segmentDefs.map(async (def) => {
            const [dist, cat] = await Promise.all([
              this.prisma.$queryRaw<SegmentDistributionRow[]>(
                segmentDistributionQuery(
                  doctorIds,
                  from,
                  toExclusive,
                  def.column,
                ),
              ),
              this.prisma.$queryRaw<SegmentCategoryRow[]>(
                segmentCategoryQuery(
                  doctorIds,
                  from,
                  toExclusive,
                  types,
                  regions,
                  def.column,
                ),
              ),
            ]);
            return { dist, cat };
          }),
        );

    const views = segmentDefs.map((def, i) =>
      this.buildSegmentView(
        def.type,
        def.labels,
        results[i].dist,
        results[i].cat,
      ),
    );

    return {
      range: { from: toIsoDate(from), to: toIsoDate(to) },
      birthType: views[0],
      mascotType: views[1],
      exerciseHabit: views[2],
    };
  }

  /** Arma un SkinReportSegmentView: reparte colores fijos, calcula el % de
   * cada bucket sobre el total del segmento, y pivota las filas de categoría
   * en scoresBySegment por clave de categoría. */
  private buildSegmentView(
    type: SegmentType,
    labels: Record<string, string>,
    distRows: SegmentDistributionRow[],
    catRows: SegmentCategoryRow[],
  ): SkinReportSegmentView {
    const total = distRows.reduce((sum, row) => sum + row.patients, 0);

    const buckets: SkinReportSegmentBucket[] = distRows.map((row, i) => ({
      value: row.segment,
      label: labels[row.segment] ?? row.segment,
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      patients: row.patients,
      analyses: row.analyses,
      avgScore: row.avg_score,
      pct: pct(row.patients, total) ?? 0,
    }));

    const byCategory = new Map<string, SkinReportSegmentCategoryComparison>();
    for (const row of catRows) {
      const key = reportableCategoryKey(row.type, row.region);
      const def = REPORTABLE_SKIN_CATEGORIES.find((c) => c.key === key);
      const entry = byCategory.get(key) ?? {
        key,
        label: def?.label ?? key,
        scoresBySegment: {},
      };
      entry.scoresBySegment[row.segment] = row.avg_score;
      byCategory.set(key, entry);
    }

    const categories = Array.from(byCategory.values()).sort((a, b) => {
      const worstA = Math.min(
        ...Object.values(a.scoresBySegment).filter(
          (v): v is number => v != null,
        ),
      );
      const worstB = Math.min(
        ...Object.values(b.scoresBySegment).filter(
          (v): v is number => v != null,
        ),
      );
      return worstA - worstB;
    });

    return { type, buckets, total, categories };
  }

  /**
   * Reporte "Análisis clínico IA" (Skiniver): diagnósticos por mes partidos
   * en clase/enfermedad/edad, más distribución por tono de piel. No usa
   * v_report_analyses/v_skin_metric_scores (exclusivas de YouCam) — consulta
   * `analyses` directo vía skiniver-reports.queries.ts. Sin comparación de
   * periodo anterior ni ventana de tendencia aparte: cubre el rango
   * filtrado completo (ver monthKeysInRange).
   */
  async getSkiniverReport(
    userId: string,
    query: SkiniverReportQueryDto,
  ): Promise<SkiniverReport> {
    const doctorIds = await this.resolveDoctorIds(
      userId,
      query.professionalUserId,
    );
    const { from, to, toExclusive } = this.resolveRange(query);
    const periods = monthKeysInRange(from, to);

    const empty = doctorIds.length === 0;
    const [diagnosisRows, ageRows, skinToneRows] = empty
      ? [[], [], []]
      : await Promise.all([
          this.prisma.$queryRaw<SkiniverDiagnosisRow[]>(
            skiniverMonthlyDiagnosesQuery(doctorIds, from, toExclusive),
          ),
          this.prisma.$queryRaw<SkiniverAgeRow[]>(
            skiniverAgeMonthlyQuery(doctorIds, from, toExclusive),
          ),
          this.prisma.$queryRaw<SkiniverSkinToneRow[]>(
            skiniverSkinToneQuery(doctorIds, from, toExclusive),
          ),
        ]);

    // ── Por clase / por enfermedad ──────────────────────────────────────────
    // "Piel Sin Patología" no es una enfermedad: classifyDiagnosisClass /
    // classifyDiseaseBucket devuelven null para excluirla (no cae en "Otras").
    const classByPeriod = new Map<string, Record<string, number>>();
    const diseaseByPeriod = new Map<string, Record<string, number>>();
    for (const row of diagnosisRows) {
      const cls = classifyDiagnosisClass(row.ai_diagnosis);
      const disease = classifyDiseaseBucket(row.ai_diagnosis);
      if (cls) {
        const bucket = classByPeriod.get(row.period) ?? {};
        bucket[cls] = (bucket[cls] ?? 0) + row.count;
        classByPeriod.set(row.period, bucket);
      }
      if (disease) {
        const bucket = diseaseByPeriod.get(row.period) ?? {};
        bucket[disease] = (bucket[disease] ?? 0) + row.count;
        diseaseByPeriod.set(row.period, bucket);
      }
    }
    const byClass: SkiniverMonthlySeriesPoint[] = periods.map((period) => ({
      period,
      counts: classByPeriod.get(period) ?? {},
    }));
    const byDisease: SkiniverMonthlySeriesPoint[] = periods.map((period) => ({
      period,
      counts: diseaseByPeriod.get(period) ?? {},
    }));

    // ── Por edad ─────────────────────────────────────────────────────────────
    const ageByPeriod = new Map<string, Record<string, number>>();
    for (const row of ageRows) {
      const bucket = ageByPeriod.get(row.period) ?? {};
      bucket[row.age_bucket] = (bucket[row.age_bucket] ?? 0) + row.count;
      ageByPeriod.set(row.period, bucket);
    }
    const byAge: SkiniverMonthlySeriesPoint[] = periods.map((period) => ({
      period,
      counts: ageByPeriod.get(period) ?? {},
    }));

    // ── Por tono de piel ─────────────────────────────────────────────────────
    const skinToneCounts = new Map<string, number>();
    for (const row of skinToneRows) {
      const bucketKey = skinToneBucketForFitzpatrick(row.fitzpatrick_type);
      if (!bucketKey) continue;
      skinToneCounts.set(
        bucketKey,
        (skinToneCounts.get(bucketKey) ?? 0) + row.count,
      );
    }
    const skinToneTotal = Array.from(skinToneCounts.values()).reduce(
      (sum, n) => sum + n,
      0,
    );
    const bySkinTone: SkiniverSkinToneBucket[] = SKIN_TONE_BUCKET_DEFS.map(
      (def) => {
        const count = skinToneCounts.get(def.key) ?? 0;
        return {
          key: def.key,
          label: def.label,
          color: def.color,
          count,
          pct: pct(count, skinToneTotal) ?? 0,
        };
      },
    );

    return {
      range: { from: toIsoDate(from), to: toIsoDate(to) },
      byClass,
      byDisease,
      byAge,
      bySkinTone,
      skinToneTotal,
    };
  }
}
