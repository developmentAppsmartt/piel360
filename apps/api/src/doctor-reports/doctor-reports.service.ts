import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  reportableCategorySqlPairs,
  type SkinHealthReport,
  type AnalisisDermaPiel360Report,
  toPublicProviderSlug,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import type { SkinHealthReportQueryDto } from './dto/skin-health-report-query.dto';
import type { AnalisisDermaPiel360ReportQueryDto } from './dto/skiniver-report-query.dto';
import {
  categoryRankingQuery,
  categoryTrendQuery,
  derivedKpiQuery,
  lifestyleSegmentQuery,
  providerVolumeQuery,
  scoreTrendQuery,
  summaryQuery,
  type CategoryRow,
  type CategoryTrendRow,
  type DerivedKpiRow,
  type LifestyleSegmentRow,
  type ProviderSegmentRow,
  type SummaryRow,
  type TrendRow,
} from './doctor-reports.queries';
import { AnalisisDermaPiel360ReportService } from './skiniver-report.service';
import { resolveReportRange, toIsoDate } from './report-range';
import { buildSkinHealthReport } from './skin-health-report.builder';

const DEFAULT_RANGE_DAYS = 30;
/**
 * Reportes analíticos del panel del doctor. Los reportes de salud de la piel
 * cubren solo **YouCam**: `analysis_results` únicamente se llena para ese
 * proveedor (Fitzpatrick escribe `Patient.fitzpatrickType`), y así lo declaran
 * las vistas que consumen las consultas. Los análisis dermatológicos, que solo
 * dejan `ai_diagnosis` + `ai_raw_response`, se reportan aparte en
 * AnalisisDermaPiel360ReportService.
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
    private readonly analisisDermaPiel360Report: AnalisisDermaPiel360ReportService,
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

  async getSkinHealthReport(
    userId: string,
    query: SkinHealthReportQueryDto,
  ): Promise<SkinHealthReport> {
    const doctorIds = await this.resolveDoctorIds(
      userId,
      query.professionalUserId,
    );
    const range = resolveReportRange(query, DEFAULT_RANGE_DAYS);
    const { from, toExclusive, prevFrom, trendMonths } = range;
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

    return buildSkinHealthReport(
      {
        summaryRows,
        trendRows,
        categoryRows,
        categoryTrendRows,
        derivedRows,
      },
      range,
    );
  }

  async getLifestyleReport(userId: string, query: SkinHealthReportQueryDto) {
    const doctorIds = await this.resolveDoctorIds(
      userId,
      query.professionalUserId,
    );
    const { from, to, toExclusive } = resolveReportRange(
      query,
      DEFAULT_RANGE_DAYS,
    );

    const empty = doctorIds.length === 0;
    const [birthRows, petRows, activityRows, providerRows] = empty
      ? [[], [], [], []]
      : await Promise.all([
          this.prisma.$queryRaw<LifestyleSegmentRow[]>(
            lifestyleSegmentQuery(doctorIds, from, toExclusive, 'birth_type'),
          ),
          this.prisma.$queryRaw<LifestyleSegmentRow[]>(
            lifestyleSegmentQuery(doctorIds, from, toExclusive, 'mascot_type'),
          ),
          this.prisma.$queryRaw<LifestyleSegmentRow[]>(
            lifestyleSegmentQuery(
              doctorIds,
              from,
              toExclusive,
              'exercise_habit',
            ),
          ),
          this.prisma.$queryRaw<ProviderSegmentRow[]>(
            providerVolumeQuery(doctorIds, from, toExclusive),
          ),
        ]);

    const mapSegments = (
      rows: LifestyleSegmentRow[],
      labels: Record<string, string>,
    ) => {
      const total = rows.reduce((sum, r) => sum + r.patients, 0);
      return rows.map((row) => ({
        key: row.segment_key,
        label: labels[row.segment_key] ?? row.segment_key,
        patients: row.patients,
        pct: total > 0 ? (row.patients / total) * 100 : 0,
        avgScore: row.avg_score,
      }));
    };

    const providerLabels: Record<string, string> = {
      youcam: 'Análisis Estético Piel 360',
      skiniver: 'Análisis Dermatológico Piel 360',
      fitzpatrick: 'Fototipo',
      unknown: 'Sin proveedor',
    };

    const providerTotal = providerRows.reduce((s, r) => s + r.analyses, 0);

    return {
      range: {
        from: toIsoDate(from),
        to: toIsoDate(to),
      },
      birthType: {
        title: 'Tipo de nacimiento',
        segments: mapSegments(birthRows, {
          normal: 'Parto natural',
          cesarean: 'Cesárea',
          unknown: 'Sin dato',
        }),
      },
      pets: {
        title: 'Mascotas y salud de la piel',
        segments: mapSegments(petRows, {
          none: 'Sin mascota',
          dog: 'Perro',
          cat: 'Gato',
          other: 'Otra',
          unknown: 'Sin dato',
        }),
      },
      activity: {
        title: 'Actividad física y deporte',
        segments: mapSegments(activityRows, {
          regular: 'Regular',
          sometimes: 'A veces',
          never: 'Nunca',
          unknown: 'Sin dato',
        }),
      },
      clinicalAi: {
        title: 'Análisis clínico IA',
        segments: providerRows.map((row) => ({
          // `provider_slug` sale de la base con el slug interno.
          key: toPublicProviderSlug(row.provider_slug),
          label:
            providerLabels[row.provider_slug] ??
            toPublicProviderSlug(row.provider_slug),
          patients: row.patients,
          analyses: row.analyses,
          pct: providerTotal > 0 ? (row.analyses / providerTotal) * 100 : 0,
          avgScore: null as number | null,
        })),
      },
    };
  }

  /** Reporte de análisis dermatológicos, acotado a los pacientes visibles del
   * usuario. El armado vive en AnalisisDermaPiel360ReportService porque el panel de admin
   * usa el mismo reporte sin filtro de doctor. */
  async getAnalisisDermaPiel360Report(
    userId: string,
    query: AnalisisDermaPiel360ReportQueryDto,
  ): Promise<AnalisisDermaPiel360Report> {
    const doctorIds = await this.resolveDoctorIds(
      userId,
      query.professionalUserId,
    );
    const { from, to, toExclusive } = resolveReportRange(
      query,
      DEFAULT_RANGE_DAYS,
    );
    return this.analisisDermaPiel360Report.build(doctorIds, {
      from,
      to,
      toExclusive,
    });
  }
}
