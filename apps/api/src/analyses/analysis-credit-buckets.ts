import type { Prisma } from '@prisma/client';
import { parsePlanProviderIds } from '../plans/plan-providers.util';

const AESTHETIC_PROVIDER_SLUGS = new Set(['youcam', 'fitzpatrick']);

/** Estético (YouCam o fototipo) frente a dermatológico. */
export function isAestheticAnalysis(row: {
  analisisPiel360TaskId?: string | null;
  fitzpatrickTaskId?: string | null;
  provider?: { slug: string } | null;
}): boolean {
  if (row.analisisPiel360TaskId || row.fitzpatrickTaskId) return true;
  const slug = row.provider?.slug;
  return slug != null && AESTHETIC_PROVIDER_SLUGS.has(slug);
}

/** Cuántos créditos de cada categoría da un plan. */
export function planCreditBuckets(
  plan: {
    analysisLimit: number;
    analysisLimits: Prisma.JsonValue;
    analysisProviderIds: Prisma.JsonValue;
    analysisProviderId: bigint;
  },
  slugById: Map<string, string>,
): { aesthetic: number; derm: number; shared: boolean } {
  const raw = plan.analysisLimits;
  const limits =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as { skiniver?: number; aesthetic?: number })
      : {};

  const hasSplit =
    typeof limits.skiniver === 'number' || typeof limits.aesthetic === 'number';
  if (hasSplit) {
    return {
      aesthetic: Math.max(0, limits.aesthetic ?? 0),
      derm: Math.max(0, limits.skiniver ?? 0),
      shared: false,
    };
  }

  const ids = parsePlanProviderIds(plan);
  const slugs = ids
    .map((id) => slugById.get(id))
    .filter((s): s is string => Boolean(s));
  const hasAnalisisDermaPiel360 = slugs.includes('skiniver');
  const hasAesthetic = slugs.some((s) => AESTHETIC_PROVIDER_SLUGS.has(s));
  const limit = Math.max(0, plan.analysisLimit);

  if (hasAnalisisDermaPiel360 && !hasAesthetic)
    return { aesthetic: 0, derm: limit, shared: false };
  if (hasAesthetic && !hasAnalisisDermaPiel360)
    return { aesthetic: limit, derm: 0, shared: false };
  // Plan que incluye ambos tipos sin desglose: `analysisLimit` es una sola
  // bolsa que alimenta las dos categorías (antes se asignaba todo a estético
  // y el pool dermatológico quedaba en 0 aunque hubiera consumo).
  if (hasAesthetic) return { aesthetic: limit, derm: limit, shared: true };
  return { aesthetic: 0, derm: limit, shared: false };
}
