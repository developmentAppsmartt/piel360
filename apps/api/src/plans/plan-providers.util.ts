import type { AnalysisProviderSlug } from '@piel360/shared';
import type { AnalysisProvider, Plan } from '@prisma/client';

type Db = { analysisProvider: { findUniqueOrThrow: (args: unknown) => Promise<AnalysisProvider> } };

export function parsePlanProviderIds(plan: {
  analysisProviderIds: unknown;
  analysisProviderId: bigint;
}): string[] {
  const raw = plan.analysisProviderIds;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((id) => String(id));
  }
  return [plan.analysisProviderId.toString()];
}

export function planIncludesProviderId(
  plan: {
    analysisProviderIds: unknown;
    analysisProviderId: bigint;
  },
  providerId: string | bigint,
): boolean {
  const target = providerId.toString();
  return parsePlanProviderIds(plan).includes(target);
}

export function resolvePlanProviderIdsFromDto(input: {
  analysisProviderIds?: string[];
  analysisProviderId?: string;
}): string[] {
  if (input.analysisProviderIds?.length) {
    return [...new Set(input.analysisProviderIds.map(String))];
  }
  if (input.analysisProviderId) {
    return [input.analysisProviderId];
  }
  return [];
}

type ProviderRow = Pick<AnalysisProvider, 'id' | 'name' | 'slug' | 'displayLabel'>;

export function attachProvidersToPlan<T extends Plan & { provider: ProviderRow }>(
  plan: T,
  allProviders: ProviderRow[],
): T & { analysisProviderIds: string[]; providers: ProviderRow[] } {
  const ids = parsePlanProviderIds(plan);
  const byId = new Map(allProviders.map((p) => [p.id.toString(), p]));
  const providers = ids
    .map((id) => byId.get(id))
    .filter((p): p is ProviderRow => Boolean(p));

  return {
    ...plan,
    analysisProviderIds: ids,
    providers: providers.length > 0 ? providers : [plan.provider],
  };
}

export async function getAnalysisProviderIdBySlug(
  db: Db,
  slug: AnalysisProviderSlug,
): Promise<bigint> {
  const row = await db.analysisProvider.findUniqueOrThrow({
    where: { slug },
  });
  return row.id;
}
