import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  analisisDermaPiel360ClassLabel,
  colombiaDateKey,
  colombiaDayStart,
} from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AnalisisDermaPiel360ReportService } from '../doctor-reports/skiniver-report.service';
import {
  CATEGORY,
  CLASS_RAW,
} from '../doctor-reports/skiniver-reports.queries';
import { DAY_MS, resolveReportRange } from '../doctor-reports/report-range';

const AGE_BUCKET_LABELS = ['Menores', 'Adultos', 'Seniors'] as const;
type AgeBucket = (typeof AGE_BUCKET_LABELS)[number];

const TOP_DIAGNOSIS_CLASSES = 8;

/** Ventana por defecto del reporte dermatológico de admin cuando no se
 * mandan fechas — el mismo "últimos 6 meses" que muestra la UI. */
const DEFAULT_SKINIVER_RANGE_DAYS = 180;

/** Rango semiabierto en días de Colombia, como el de los reportes del doctor. */
type CreatedAtRange = { gte?: Date; lt?: Date };

type Granularity = 'day' | 'month' | 'year';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analisisDermaPiel360Report: AnalisisDermaPiel360ReportService,
  ) {}

  /** Reporte dermatológico global: mismo armado que el del panel del doctor
   * (AnalisisDermaPiel360ReportService), con `doctorIds = null` para no filtrar. */
  async getAnalisisDermaPiel360Report(startDate?: string, endDate?: string) {
    const { from, to, toExclusive } = resolveReportRange(
      { from: startDate, to: endDate },
      DEFAULT_SKINIVER_RANGE_DAYS,
    );
    return this.analisisDermaPiel360Report.build(null, {
      from,
      to,
      toExclusive,
    });
  }

  /** Port de SubscriptionStats.php + RiskChart.php (Filament, sistema viejo).
   * `SubscriptionStatus` acá no tiene un estado `expired` explícito (a
   * diferencia del modelo Eloquent viejo) — "vencidas" se calcula por fecha
   * sobre suscripciones que quedaron en `active` pero ya pasaron `endsAt`
   * (nada las transiciona automáticamente hoy). `aiProbability` es nullable
   * (YouCam no tiene un único score de riesgo) — se excluye de los buckets,
   * igual que el Laravel viejo (donde todo análisis era Skiniver y siempre
   * tenía probabilidad). */
  async getDashboardStats() {
    const [subscriptions, lowRisk, mediumRisk, highRisk] = await Promise.all([
      this.getSubscriptionStatusCounts(),
      this.prisma.analysis.count({
        where: { aiProbability: { not: null, lt: 0.33 } },
      }),
      this.prisma.analysis.count({
        where: { aiProbability: { gte: 0.33, lte: 0.66 } },
      }),
      this.prisma.analysis.count({
        where: { aiProbability: { gt: 0.66 } },
      }),
    ]);

    return {
      subscriptions,
      riskDistribution: { low: lowRisk, medium: mediumRisk, high: highRisk },
    };
  }

  /** Port de ReportesDiagnosticos.php + sus 4 widgets (Filament, sistema
   * viejo). El PHP original solo aplicaba el filtro de fecha de forma
   * parcial/inconsistente entre widgets (ver MIGRACION.md) — acá se aplica
   * de forma consistente a los 3 reportes basados en eventos (diagnóstico
   * por clase, por edad, serie de tiempo). La distribución de suscripciones
   * queda deliberadamente sin filtrar por fecha: es una foto del estado
   * actual, no un conteo de eventos en el rango. */
  async getReports(
    startDate?: string,
    endDate?: string,
    granularity: Granularity = 'month',
  ) {
    const createdAt = this.buildDateRange(startDate, endDate);

    const [subscriptionStatus, diagnosisByClass, diagnosisByAge, timeSeries] =
      await Promise.all([
        this.getSubscriptionStatusCounts(),
        this.getDiagnosisByClass(createdAt),
        this.getDiagnosisByAge(createdAt),
        this.getTimeSeries(createdAt, granularity),
      ]);

    return { subscriptionStatus, diagnosisByClass, diagnosisByAge, timeSeries };
  }

  /** Antes era `lte: endDate` a las 00:00Z, que dejaba fuera casi todo el
   * último día, y los cortes iban en UTC. */
  private buildDateRange(
    startDate?: string,
    endDate?: string,
  ): CreatedAtRange | undefined {
    if (!startDate && !endDate) return undefined;
    return {
      ...(startDate ? { gte: colombiaDayStart(startDate) } : {}),
      ...(endDate
        ? { lt: new Date(colombiaDayStart(endDate).getTime() + DAY_MS) }
        : {}),
    };
  }

  private async getSubscriptionStatusCounts() {
    const now = new Date();

    const [active, pending, expired] = await Promise.all([
      this.prisma.subscription.count({
        where: {
          status: 'active',
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      }),
      this.prisma.subscription.count({ where: { status: 'pending' } }),
      this.prisma.subscription.count({
        where: { status: 'active', endsAt: { lt: now } },
      }),
    ]);

    return { active, pending, expired };
  }

  /** Agrupa por la clase del diagnóstico que cuenta (el del profesional o el
   * de la IA), igual que el reporte dermatológico. Antes, sin `desease` caía
   * al `aiDiagnosis` crudo, que es una enfermedad: mezclaba los dos niveles. */
  private async getDiagnosisByClass(createdAt: CreatedAtRange | undefined) {
    const rows = await this.prisma.$queryRaw<
      { category: string | null; class_raw: string | null; count: number }[]
    >(Prisma.sql`
      SELECT
        ${CATEGORY}   AS category,
        ${CLASS_RAW}  AS class_raw,
        COUNT(*)::int AS count
      FROM analyses a
      WHERE COALESCE(${CATEGORY}, ${CLASS_RAW}) IS NOT NULL
        ${this.createdAtFilter(createdAt)}
      GROUP BY 1, 2
    `);

    const totals = new Map<string, number>();
    for (const row of rows) {
      const label = analisisDermaPiel360ClassLabel(row.category, row.class_raw);
      if (label) totals.set(label, (totals.get(label) ?? 0) + row.count);
    }
    const sorted = [...totals]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const top = sorted.slice(0, TOP_DIAGNOSIS_CLASSES);
    const rest = sorted.slice(TOP_DIAGNOSIS_CLASSES);
    const otherCount = rest.reduce((sum, g) => sum + g.count, 0);

    return otherCount > 0
      ? [...top, { label: 'Otros', count: otherCount }]
      : top;
  }

  /** Agrega en SQL y calcula la edad **a la fecha del análisis**, no a hoy:
   * antes se descargaba un registro por análisis y un paciente que cumplía
   * años cambiaba retroactivamente de bucket en reportes ya publicados. */
  private async getDiagnosisByAge(createdAt: CreatedAtRange | undefined) {
    const rows = await this.prisma.$queryRaw<
      { bucket: AgeBucket; count: number }[]
    >(Prisma.sql`
      WITH scoped AS (
        SELECT date_part('year', age(a.created_at, p.birth_date))::int AS age_years
        FROM analyses a
        JOIN patients p ON p.id = a.patient_id
        WHERE p.birth_date IS NOT NULL
          ${this.createdAtFilter(createdAt)}
      )
      SELECT
        CASE
          WHEN age_years < 18 THEN 'Menores'
          WHEN age_years <= 60 THEN 'Adultos'
          ELSE 'Seniors'
        END           AS bucket,
        COUNT(*)::int AS count
      FROM scoped
      GROUP BY 1
    `);

    const counts = new Map(rows.map((r) => [r.bucket, r.count]));
    return AGE_BUCKET_LABELS.map((label) => ({
      label,
      count: counts.get(label) ?? 0,
    }));
  }

  /** Filtro de fecha reutilizable para las queries raw de reportes. */
  private createdAtFilter(createdAt: CreatedAtRange | undefined): Prisma.Sql {
    if (!createdAt) return Prisma.empty;
    return Prisma.sql`
      ${createdAt.gte ? Prisma.sql`AND a.created_at >= ${createdAt.gte}` : Prisma.empty}
      ${createdAt.lt ? Prisma.sql`AND a.created_at < ${createdAt.lt}` : Prisma.empty}
    `;
  }

  private async getTimeSeries(
    createdAt: CreatedAtRange | undefined,
    granularity: Granularity,
  ) {
    const analyses = await this.prisma.analysis.findMany({
      where: createdAt ? { createdAt } : undefined,
      select: { createdAt: true },
    });

    const counts = new Map<string, number>();
    for (const { createdAt: date } of analyses) {
      const key = this.periodKey(date, granularity);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /** Periodo del día de Colombia en que se hizo el análisis. */
  private periodKey(date: Date, granularity: Granularity): string {
    const day = colombiaDateKey(date);
    if (granularity === 'day') return day;
    if (granularity === 'year') return day.slice(0, 4);
    return day.slice(0, 7);
  }

  /** Marcadores para el mapa de registros (doctores y pacientes con coords). */
  async getMapMarkers(kind?: 'doctor' | 'patient') {
    const includeDoctors = !kind || kind === 'doctor';
    const includePatients = !kind || kind === 'patient';

    const [doctors, patients] = await Promise.all([
      includeDoctors
        ? this.prisma.doctor.findMany({
            where: { lat: { not: null }, lng: { not: null } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialty: true,
              city: true,
              lat: true,
              lng: true,
              membershipType: true,
              verificationStatus: true,
            },
          })
        : Promise.resolve([]),
      includePatients
        ? this.prisma.patient.findMany({
            where: { lat: { not: null }, lng: { not: null } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              address: true,
              lat: true,
              lng: true,
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      doctors: doctors.map((d) => ({
        id: d.id.toString(),
        kind: 'doctor' as const,
        name: `${d.firstName} ${d.lastName}`.trim(),
        specialty: d.specialty,
        city: d.city,
        membershipType: d.membershipType,
        verificationStatus: d.verificationStatus,
        lat: Number(d.lat),
        lng: Number(d.lng),
      })),
      patients: patients.map((p) => ({
        id: p.id.toString(),
        kind: 'patient' as const,
        name: `${p.firstName} ${p.lastName}`.trim(),
        city: p.address,
        lat: Number(p.lat),
        lng: Number(p.lng),
      })),
    };
  }
}
