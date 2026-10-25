import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { colombiaDateKey } from '@piel360/shared';
import type { JwtPayload } from '../auth/types';
import { resolveReportRange } from '../doctor-reports/report-range';
import { OrgContextService } from '../organizations/org-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSubscriptionEndsAt } from '../subscriptions/subscription-ends.util';
import { isDoctorPanelRole } from './analyses.service';
import {
  isAestheticAnalysis,
  planCreditBuckets,
} from './analysis-credit-buckets';

function emptyPool() {
  return {
    /** Créditos consumidos en los planes vigentes. */
    done: 0,
    limit: 0,
    available: 0,
    /** Créditos consumidos dentro del rango de fechas consultado. */
    periodDone: 0,
    /** El límite es una bolsa compartida con la otra categoría. */
    shared: false,
    /** Vencimiento del plan vigente de esta categoría que vence primero
     * (del que se descuenta: SubscriptionCreditsService.findActiveForUser). */
    endsAt: null as Date | null,
  };
}

type Pool = ReturnType<typeof emptyPool>;

/**
 * Consumo de análisis (estético vs dermatológico). Todo sale de
 * `subscription_usages`; contar filas de `analyses` incluiría análisis que
 * nunca descontaron crédito (YouCam sin completar, o sin suscripción).
 *
 * - Las tarjetas son el saldo de los planes **vigentes**: un plan vencido
 *   sigue en `active` (nada lo cambia) y sumarlo mostraba créditos que ya no
 *   se pueden usar.
 * - El periodo cuenta los créditos de **todos** los planes de la cuenta: lo
 *   gastado en un plan que luego se canceló también se gastó.
 * - Los días son de Colombia, como en los reportes.
 */
@Injectable()
export class AnalysisConsumptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
  ) {}

  async getConsumption(
    currentUser: JwtPayload,
    query: { from?: string; to?: string; professionalUserId?: string } = {},
  ) {
    const range = consumptionRange(query.from, query.to);
    const { subscriptionUserIds, professionalUserId } = await this.resolveScope(
      currentUser,
      query.professionalUserId,
    );
    const byUser = subscriptionUserIds
      ? { userId: { in: subscriptionUserIds } }
      : {};

    const [providers, subscriptions] = await Promise.all([
      this.prisma.analysisProvider.findMany({
        select: { id: true, slug: true },
      }),
      this.prisma.subscription.findMany({
        where: { status: 'active', ...byUser },
        include: {
          plan: true,
          usages: {
            select: {
              quantity: true,
              analysis: {
                select: {
                  analisisPiel360TaskId: true,
                  fitzpatrickTaskId: true,
                  provider: { select: { slug: true } },
                },
              },
            },
          },
        },
      }),
    ]);
    const slugById = new Map(providers.map((p) => [p.id.toString(), p.slug]));

    const aesthetic = emptyPool();
    const derm = emptyPool();
    const now = new Date();

    for (const sub of subscriptions) {
      const endsAt = resolveSubscriptionEndsAt(sub, sub.plan);
      if (!endsAt || endsAt <= now) continue;

      const buckets = planCreditBuckets(sub.plan, slugById);
      let doneAesthetic = 0;
      let doneDerm = 0;
      for (const usage of sub.usages) {
        const qty = usage.quantity ?? 1;
        if (isAestheticAnalysis(usage.analysis)) doneAesthetic += qty;
        else doneDerm += qty;
      }

      // Un plan mixto sin split en `analysisLimits` es una bolsa compartida:
      // el consumo de las dos categorías descuenta del mismo límite.
      const spent = doneAesthetic + doneDerm;
      addToPool(
        aesthetic,
        buckets.aesthetic,
        doneAesthetic,
        buckets.shared ? spent : doneAesthetic,
        buckets.shared,
        endsAt,
      );
      addToPool(
        derm,
        buckets.derm,
        doneDerm,
        buckets.shared ? spent : doneDerm,
        buckets.shared,
        endsAt,
      );
    }

    // El filtro por profesional solo afecta a lo "del periodo" (serie diaria,
    // detalle y `periodDone`). `limit`/`done`/`available` salen de las
    // suscripciones y son el saldo del plan de la empresa, no de una persona.
    const usages = await this.prisma.subscriptionUsage.findMany({
      where: {
        createdAt: { gte: range.from, lt: range.toExclusive },
        ...(subscriptionUserIds ? { subscription: byUser } : {}),
        ...(professionalUserId
          ? { analysis: { userId: professionalUserId } }
          : {}),
      },
      select: {
        quantity: true,
        createdAt: true,
        analysis: {
          select: {
            patientId: true,
            analisisPiel360TaskId: true,
            fitzpatrickTaskId: true,
            provider: { select: { slug: true } },
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // La gráfica es por día y el detalle por día Y profesional: con varios
    // miembros consumiendo el mismo día, una sola fila por día atribuía todos
    // los créditos al que más gastó y ocultaba a los demás.
    type ProBucket = {
      name: string;
      aesthetic: number;
      derm: number;
      patients: Set<string>;
    };
    const byDay = new Map<
      string,
      { aesthetic: number; derm: number; pros: Map<string, ProBucket> }
    >();

    for (const usage of usages) {
      // Para YouCam el crédito se consume al completarse el task, no al crear
      // el análisis: la fecha de la fila es la del cobro, que es lo correcto acá.
      const key = colombiaDateKey(usage.createdAt);
      let bucket = byDay.get(key);
      if (!bucket) {
        bucket = { aesthetic: 0, derm: 0, pros: new Map() };
        byDay.set(key, bucket);
      }
      // Se agrupa por id y no por nombre: dos miembros pueden llamarse igual.
      const proKey = usage.analysis.user?.id?.toString() ?? '';
      let pro = bucket.pros.get(proKey);
      if (!pro) {
        pro = {
          name: usage.analysis.user?.name?.trim() || 'Sin asignar',
          aesthetic: 0,
          derm: 0,
          patients: new Set(),
        };
        bucket.pros.set(proKey, pro);
      }

      const qty = usage.quantity ?? 1;
      if (isAestheticAnalysis(usage.analysis)) {
        bucket.aesthetic += qty;
        pro.aesthetic += qty;
        aesthetic.periodDone += qty;
      } else {
        bucket.derm += qty;
        pro.derm += qty;
        derm.periodDone += qty;
      }
      pro.patients.add(usage.analysis.patientId.toString());
    }

    const sortedKeys = [...byDay.keys()].sort();
    const daily = sortedKeys.map((key) => {
      const b = byDay.get(key)!;
      return {
        date: formatDayShort(key),
        aesthetic: b.aesthetic,
        derm: b.derm,
      };
    });

    const rows = [...sortedKeys].reverse().flatMap((key) => {
      const b = byDay.get(key)!;
      return [...b.pros.entries()]
        .map(([proKey, pro]) => ({
          date: formatDayLong(key),
          aesthetic: pro.aesthetic,
          derm: pro.derm,
          total: pro.aesthetic + pro.derm,
          patients: pro.patients.size,
          professional: pro.name,
          professionalUserId: proKey || null,
        }))
        .sort(
          (a, z) =>
            z.total - a.total || a.professional.localeCompare(z.professional),
        );
    });

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      aesthetic: serializePool(aesthetic),
      derm: serializePool(derm),
      daily,
      rows,
    };
  }

  /** De quién son las suscripciones y a qué profesional se filtra. Mismo
   * contrato que los reportes (DoctorReportsService#resolveDoctorIds): solo el
   * dueño del equipo puede filtrar por profesional. */
  private async resolveScope(
    currentUser: JwtPayload,
    requestedProfessional?: string,
  ): Promise<{
    subscriptionUserIds: bigint[] | null;
    professionalUserId: bigint | null;
  }> {
    if (currentUser.role === 'superadmin') {
      // Plataforma completa.
      return {
        subscriptionUserIds: null,
        professionalUserId: requestedProfessional
          ? BigInt(requestedProfessional)
          : null,
      };
    }
    if (!isDoctorPanelRole(currentUser.role)) {
      throw new ForbiddenException(
        'No tienes permiso para consultar el consumo de análisis',
      );
    }

    await this.orgContext.assertTeamPermissionForUser(
      currentUser.sub,
      'billing',
    );
    const scope = await this.orgContext.resolvePatientDoctorScope(
      currentUser.sub,
    );
    const subscriptionUserIds = [scope.ctx.subscriptionUserId];
    if (!requestedProfessional) {
      return { subscriptionUserIds, professionalUserId: null };
    }

    if (!scope.ctx.isOrgOwner) {
      throw new ForbiddenException(
        'Solo el dueño del equipo puede filtrar por profesional',
      );
    }
    const professional = scope.professionals.find(
      (item) => item.userId === requestedProfessional,
    );
    if (!professional) {
      throw new BadRequestException('Profesional no encontrado en tu equipo');
    }
    return {
      subscriptionUserIds,
      professionalUserId: BigInt(professional.userId),
    };
  }
}

function addToPool(
  pool: Pool,
  limit: number,
  done: number,
  spent: number,
  shared: boolean,
  endsAt: Date,
) {
  pool.limit += limit;
  pool.done += done;
  pool.available += Math.max(0, limit - spent);
  pool.shared ||= shared;
  if (limit > 0 && (!pool.endsAt || endsAt < pool.endsAt)) {
    pool.endsAt = endsAt;
  }
}

function serializePool(pool: Pool) {
  return { ...pool, endsAt: pool.endsAt?.toISOString() ?? null };
}

/** Días de Colombia. Sin fechas: el mes en curso hasta hoy; con solo `from`,
 * ese día. */
function consumptionRange(from?: string, to?: string) {
  if (!from) {
    const today = colombiaDateKey(new Date());
    return resolveReportRange(
      { from: `${today.slice(0, 7)}-01`, to: today },
      1,
    );
  }
  return resolveReportRange({ from, to: to ?? from }, 1);
}

function formatDayShort(key: string) {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}

function formatDayLong(key: string) {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}
