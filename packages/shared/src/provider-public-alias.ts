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

/**
 * Las bolsas de unidades se nombran por el proveedor que las cobra, y Perfect
 * Corp es el dueno de YouCam: por eso `perfectcorp` y `youcam` comparten slug
 * publico. El mapa va aparte porque la vuelta atras es distinta — un
 * `analisispiel360` que venia de una bolsa es `perfectcorp`, no `youcam`.
 */
export const POOL_PUBLIC_ALIASES = {
  skiniver: "analisisdermapiel360",
  perfectcorp: "analisispiel360",
} as const;

export type InternalPoolSlug = keyof typeof POOL_PUBLIC_ALIASES;

const INTERNAL_POOL_FROM_PUBLIC: Record<string, InternalPoolSlug> = {
  analisisdermapiel360: "skiniver",
  analisispiel360: "perfectcorp",
};

export function toPublicPoolSlug(slug: string): string {
  return POOL_PUBLIC_ALIASES[slug as InternalPoolSlug] ?? slug;
}

export function toInternalPoolSlug(slug: string): string {
  return INTERNAL_POOL_FROM_PUBLIC[slug] ?? slug;
}

/** Renombra las CLAVES de un objeto indexado por proveedor
 * (`analysisLimits`, `apiCostPerProvider`). Las claves que no son un
 * proveedor —`aesthetic`, `fitzpatrick`— se quedan como estan. */
export function toPublicProviderKeys<T>(
  record: Record<string, T> | null | undefined,
): Record<string, T> | null | undefined {
  if (!record || typeof record !== "object") return record;
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [toPublicProviderSlug(key), value]),
  );
}

export function toInternalProviderKeys<T>(
  record: Record<string, T> | null | undefined,
): Record<string, T> | null | undefined {
  if (!record || typeof record !== "object") return record;
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [toInternalProviderSlug(key), value]),
  );
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
  apiCosts?: unknown;
  poolProvider?: unknown;
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

  const mapKeys = (valor: unknown) =>
    valor && typeof valor === "object" && !Array.isArray(valor)
      ? toPublicProviderKeys(valor as Record<string, unknown>)
      : valor;

  return {
    ...plan,
    provider: mapProvider(plan.provider),
    ...(plan.providers
      ? { providers: plan.providers.map(mapProvider) }
      : {}),
    analysisLimits: mapKeys(plan.analysisLimits),
    ...(plan.apiCosts !== undefined
      ? { apiCosts: mapKeys(plan.apiCosts) }
      : {}),
    ...(typeof plan.poolProvider === "string"
      ? { poolProvider: toPublicPoolSlug(plan.poolProvider) }
      : {}),
  };
}
