import type { Plan } from '@prisma/client';
import { planCreditBuckets } from '../analyses/analysis-credit-buckets';
import { planSaleType } from '../billing/plan-sale-type';
import { parsePlanProviderIds } from '../plans/plan-providers.util';

/**
 * Créditos de bolsa por análisis. El plan guarda cuántos análisis vende;
 * la bolsa se descuenta en créditos del proveedor.
 * Estético HD = 22, fototipo = 10, dermatológico = 1.
 */
export const AESTHETIC_CREDITS_PER_ANALYSIS = 22;
export const FITZPATRICK_CREDITS_PER_ANALYSIS = 10;

export type PlanBagInput = Pick<
  Plan,
  | 'analysisLimit'
  | 'analysisLimits'
  | 'analysisProviderIds'
  | 'analysisProviderId'
>;

export function bagCreditsForPlan(
  plan: PlanBagInput,
  slugById: Map<string, string>,
): number {
  const buckets = planCreditBuckets(plan, slugById);
  const type = planSaleType(plan, slugById);
  if (type === 'fototipo') {
    return buckets.aesthetic * FITZPATRICK_CREDITS_PER_ANALYSIS;
  }
  if (type === 'derm') return buckets.derm;
  if (type === 'aesthetic') {
    return buckets.aesthetic * AESTHETIC_CREDITS_PER_ANALYSIS;
  }

  const slugs = parsePlanProviderIds(plan)
    .map((id) => slugById.get(id))
    .filter((slug): slug is string => Boolean(slug));
  const aestheticRate =
    slugs.includes('fitzpatrick') && !slugs.includes('youcam')
      ? FITZPATRICK_CREDITS_PER_ANALYSIS
      : AESTHETIC_CREDITS_PER_ANALYSIS;
  return buckets.aesthetic * aestheticRate + buckets.derm;
}
