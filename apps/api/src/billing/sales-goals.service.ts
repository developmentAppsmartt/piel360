import { Injectable } from '@nestjs/common';
import { colombiaDateKey, colombiaDayStart } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateSalesGoalsDto } from './dto/update-sales-goals.dto';
import {
  GOAL_PLAN_TYPES,
  planSaleType,
  type GoalPlanType,
} from './plan-sale-type';

/** Por debajo del ritmo del mes, pero cerca: «Cerca de la meta». */
const NEAR_PERCENT = 80;

export type GoalStatus = 'met' | 'on_track' | 'near' | 'behind' | 'none';

/**
 * Estado de una meta según el ritmo del mes (lo eligió el cliente): ir al
 * 60 % el día 10 es ir bien; ir al 80 % el último día, no.
 */
export function goalStatus(
  percent: number,
  monthProgress: number,
  hasTarget: boolean,
): GoalStatus {
  if (!hasTarget) return 'none';
  if (percent >= 100) return 'met';
  if (percent >= monthProgress * 100) return 'on_track';
  return percent >= NEAR_PERCENT ? 'near' : 'behind';
}

/** Fracción del mes de Colombia ya transcurrida (el día en curso cuenta). */
export function monthProgress(month: string, now = new Date()): number {
  const today = colombiaDateKey(now);
  const current = today.slice(0, 7);
  if (month < current) return 1;
  if (month > current) return 0;
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Number(today.slice(8, 10)) / daysInMonth;
}

/** Inicio del mes `YYYY-MM` y del siguiente, en hora de Colombia. */
function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number);
  const next =
    m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return {
    from: colombiaDayStart(`${month}-01`),
    to: colombiaDayStart(`${next}-01`),
  };
}

@Injectable()
export class SalesGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Meta, vendidos (compras pagadas del mes) y estado por tipo de plan. */
  async summary(month: string, slugById: Map<string, string>) {
    const { from, to } = monthBounds(month);
    const [goals, invoices] = await Promise.all([
      this.prisma.salesGoal.findMany({ where: { month } }),
      this.prisma.subscriptionInvoice.findMany({
        where: { createdAt: { gte: from, lt: to } },
        select: {
          plan: {
            select: { analysisProviderIds: true, analysisProviderId: true },
          },
        },
      }),
    ]);

    const sold = new Map<string, number>();
    for (const inv of invoices) {
      const type = planSaleType(inv.plan, slugById);
      sold.set(type, (sold.get(type) ?? 0) + 1);
    }

    const progress = monthProgress(month);
    return {
      month,
      monthProgress: progress,
      items: GOAL_PLAN_TYPES.map((type) => {
        const target = goals.find((g) => g.planType === type)?.target ?? null;
        const count = sold.get(type) ?? 0;
        const percent = target ? Math.round((count / target) * 100) : 0;
        return {
          type,
          target,
          sold: count,
          percent,
          status: goalStatus(percent, progress, Boolean(target)),
        };
      }),
    };
  }

  /** Guarda las metas que vengan; un tipo que no viene no se toca. */
  async update(dto: UpdateSalesGoalsDto) {
    const entries = GOAL_PLAN_TYPES.flatMap((type) => {
      const target = dto[type];
      return target == null ? [] : [{ type, target }];
    });
    await this.prisma.$transaction(
      entries.map(({ type, target }: { type: GoalPlanType; target: number }) =>
        this.prisma.salesGoal.upsert({
          where: { month_planType: { month: dto.month, planType: type } },
          create: { month: dto.month, planType: type, target },
          update: { target },
        }),
      ),
    );
    return { ok: true };
  }
}
