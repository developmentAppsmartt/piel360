import type { AnalysisProviderSlug } from "./constants.js";

/** Permisos RBAC que habilitan el uso de un proveedor de análisis / plan. */
export const PROVIDER_USAGE_PERMISSIONS: Record<
  AnalysisProviderSlug,
  `use_provider_${AnalysisProviderSlug}`
> = {
  skiniver: "use_provider_skiniver",
  youcam: "use_provider_youcam",
  fitzpatrick: "use_provider_fitzpatrick",
};

export const PROVIDER_USAGE_PERMISSION_NAMES = Object.values(
  PROVIDER_USAGE_PERMISSIONS,
) as readonly (typeof PROVIDER_USAGE_PERMISSIONS)[AnalysisProviderSlug][];

export function providerSlugFromUsagePermission(
  permission: string,
): AnalysisProviderSlug | null {
  const entry = Object.entries(PROVIDER_USAGE_PERMISSIONS).find(
    ([, name]) => name === permission,
  );
  return (entry?.[0] as AnalysisProviderSlug | undefined) ?? null;
}
