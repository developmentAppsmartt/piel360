import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AGE_BUCKET_LABELS = ['Menores', 'Adultos', 'Seniors'] as const;
type AgeBucket = (typeof AGE_BUCKET_LABELS)[number];

const TOP_DIAGNOSIS_CLASSES = 8;

type Granularity = 'day' | 'month' | 'year';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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

  private buildDateRange(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;
    return {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
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

  private async getDiagnosisByClass(
    createdAt: { gte?: Date; lte?: Date } | undefined,
  ) {
    const groups = await this.prisma.analysis.groupBy({
      by: ['aiDiagnosis'],
      where: {
        aiDiagnosis: { not: null },
        ...(createdAt ? { createdAt } : {}),
      },
      _count: true,
    });

    const sorted = groups
      .map((g) => ({ label: g.aiDiagnosis as string, count: g._count }))
      .sort((a, b) => b.count - a.count);

    const top = sorted.slice(0, TOP_DIAGNOSIS_CLASSES);
    const rest = sorted.slice(TOP_DIAGNOSIS_CLASSES);
    const otherCount = rest.reduce((sum, g) => sum + g.count, 0);

    return otherCount > 0
      ? [...top, { label: 'Otros', count: otherCount }]
      : top;
  }

  private async getDiagnosisByAge(
    createdAt: { gte?: Date; lte?: Date } | undefined,
  ) {
    const analyses = await this.prisma.analysis.findMany({
      where: createdAt ? { createdAt } : undefined,
      select: { patient: { select: { birthDate: true } } },
    });

    const counts: Record<AgeBucket, number> = {
      Menores: 0,
      Adultos: 0,
      Seniors: 0,
    };
    const now = Date.now();

    for (const { patient } of analyses) {
      if (!patient?.birthDate) continue;
      const ageMs = now - patient.birthDate.getTime();
      const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
      const bucket: AgeBucket =
        age < 18 ? 'Menores' : age <= 60 ? 'Adultos' : 'Seniors';
      counts[bucket] += 1;
    }

    return AGE_BUCKET_LABELS.map((label) => ({ label, count: counts[label] }));
  }

  private async getTimeSeries(
    createdAt: { gte?: Date; lte?: Date } | undefined,
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

  private periodKey(date: Date, granularity: Granularity): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    if (granularity === 'day') return `${year}-${month}-${day}`;
    if (granularity === 'year') return `${year}`;
    return `${year}-${month}`;
  }
}
