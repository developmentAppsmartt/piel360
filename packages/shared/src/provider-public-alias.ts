/**
 * Alias públicos de proveedores de análisis.
 * Los slugs internos (BD, webhooks, RBAC, APIs vendor) no cambian;
 * solo se enmascaran en respuestas/rutas visibles al cliente.
 *
 * YouCam   → analisispiel360
 * Skiniver → analisisdermapiel360
 */

export const PROVIDER_PUBLIC_ALIASES = {
  youcam: "analisispiel360",
  skiniver: "analisisdermapiel360",
} as const;

export type InternalMaskedProviderSlug = keyof typeof PROVIDER_PUBLIC_ALIASES;
export type PublicProviderAlias =
  (typeof PROVIDER_PUBLIC_ALIASES)[InternalMaskedProviderSlug];

const INTERNAL_FROM_PUBLIC: Record<string, InternalMaskedProviderSlug> = {
  analisispiel360: "youcam",
  analisisdermapiel360: "skiniver",
};

export function toPublicProviderSlug(slug: string): string {
  return (
    PROVIDER_PUBLIC_ALIASES[slug as InternalMaskedProviderSlug] ?? slug
  );
}

export function toInternalProviderSlug(slug: string): string {
  return INTERNAL_FROM_PUBLIC[slug] ?? slug;
}

/** `use_provider_youcam` → `use_provider_analisispiel360` (y equivalentes). */
export function toPublicProviderPermission(permission: string): string {
  for (const [internal, pub] of Object.entries(PROVIDER_PUBLIC_ALIASES)) {
    if (permission === `use_provider_${internal}`) {
      return `use_provider_${pub}`;
    }
    if (permission === `patient_run_${internal}`) {
      return `patient_run_${pub}`;
    }
  }
  return permission;
}

export function toInternalProviderPermission(permission: string): string {
  for (const [pub, internal] of Object.entries(INTERNAL_FROM_PUBLIC)) {
    if (permission === `use_provider_${pub}`) {
      return `use_provider_${internal}`;
    }
    if (permission === `patient_run_${pub}`) {
      return `patient_run_${internal}`;
    }
  }
  return permission;
}

export function toPublicProviderPermissions(permissions: string[]): string[] {
  return permissions.map(toPublicProviderPermission);
}

export function toPublicProviderSlugs(slugs: string[]): string[] {
  return slugs.map(toPublicProviderSlug);
}

/** Expande un permiso o slug a interno + público para comparaciones duales. */
export function expandProviderPermissionAliases(permission: string): string[] {
  const pub = toPublicProviderPermission(permission);
  const internal = toInternalProviderPermission(permission);
  return [...new Set([permission, pub, internal])];
}

export function expandProviderSlugAliases(slug: string): string[] {
  const pub = toPublicProviderSlug(slug);
  const internal = toInternalProviderSlug(slug);
  return [...new Set([slug, pub, internal])];
}

export function providerSlugMatches(
  candidate: string,
  allowed: Iterable<string>,
): boolean {
  const allowedSet = new Set(
    [...allowed].flatMap((slug) => expandProviderSlugAliases(slug)),
  );
  return expandProviderSlugAliases(candidate).some((s) => allowedSet.has(s));
}

type ProviderLike = {
  id: string | bigint;
  name: string;
  slug: string;
  displayLabel?: string | null;
};

/** Enmascara slug (y name si coincide con el vendor) en un plan serializado al cliente. */
export function toPublicPlanProviders<T extends {
  provider: ProviderLike;
  providers?: ProviderLike[];
  analysisLimits?: unknown;
}>(plan: T): T {
  const mapProvider = (p: ProviderLike) => {
    const publicSlug = toPublicProviderSlug(p.slug);
    const nameLooksVendor =
      /youcam|skiniver|perfect/i.test(p.name) || p.name === p.slug;
    return {
      ...p,
      id: typeof p.id === "bigint" ? p.id.toString() : p.id,
      slug: publicSlug,
      name: nameLooksVendor
        ? (p.displayLabel?.trim() || publicSlug)
        : p.name,
    };
  };

  let analysisLimits = plan.analysisLimits;
  if (
    analysisLimits &&
    typeof analysisLimits === "object" &&
    !Array.isArray(analysisLimits)
  ) {
    analysisLimits = Object.fromEntries(
      Object.entries(analysisLimits as Record<string, unknown>).map(
        ([key, value]) => [
          key === "skiniver" ? PROVIDER_PUBLIC_ALIASES.skiniver : key,
          value,
        ],
      ),
    );
  }

  return {
    ...plan,
    provider: mapProvider(plan.provider),
    ...(plan.providers
      ? { providers: plan.providers.map(mapProvider) }
      : {}),
    analysisLimits,
  };
}
