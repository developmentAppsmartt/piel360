import type { Prisma } from '@prisma/client';
import { parsePlanProviderIds } from '../plans/plan-providers.util';

/** Tipo de plan para facturación y metas. Es lo único que llega al
 * navegador: el slug interno del proveedor no sale del API. */
export type PlanSaleType = 'aesthetic' | 'derm' | 'fototipo' | 'mixed';

/** Los tres tipos con tarjeta y meta propias (Mixto solo suma al total). */
export const GOAL_PLAN_TYPES = ['aesthetic', 'derm', 'fototipo'] as const;
export type GoalPlanType = (typeof GOAL_PLAN_TYPES)[number];

const TYPE_BY_SLUG: Record<string, Exclude<PlanSaleType, 'mixed'>> = {
  youcam: 'aesthetic',
  skiniver: 'derm',
  fitzpatrick: 'fototipo',
};

/**
 * Por proveedores, no por `analysisLimits`: un plan de fototipo guarda su
 * límite en la bolsa `aesthetic` y se confundiría con uno estético.
 */
export function planSaleType(
  plan: { analysisProviderIds: Prisma.JsonValue; analysisProviderId: bigint },
  slugById: Map<string, string>,
): PlanSaleType {
  const types = new Set(
    parsePlanProviderIds(plan)
      .map((id) => TYPE_BY_SLUG[slugById.get(id) ?? ''])
      .filter(Boolean),
  );
  if (types.size === 1) return [...types][0];
  return types.size > 1 ? 'mixed' : 'derm';
}
