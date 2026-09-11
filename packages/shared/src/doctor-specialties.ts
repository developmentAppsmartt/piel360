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

/**
 * Permisos del rol paciente para ejecutar análisis solicitados (app móvil).
 * No son módulos `clinical.*`: no deben promover el panel a médico.
 */
export const PATIENT_PROVIDER_RUN_PERMISSIONS: Partial<
  Record<AnalysisProviderSlug, `patient_run_${AnalysisProviderSlug}`>
> = {
  youcam: "patient_run_youcam",
  fitzpatrick: "patient_run_fitzpatrick",
};

export const PATIENT_PROVIDER_RUN_PERMISSION_NAMES = Object.values(
  PATIENT_PROVIDER_RUN_PERMISSIONS,
) as readonly string[];

export function providerSlugFromUsagePermission(
  permission: string,
): AnalysisProviderSlug | null {
  const professional = Object.entries(PROVIDER_USAGE_PERMISSIONS).find(
    ([, name]) => name === permission,
  );
  if (professional) return professional[0] as AnalysisProviderSlug;

  const patient = Object.entries(PATIENT_PROVIDER_RUN_PERMISSIONS).find(
    ([, name]) => name === permission,
  );
  return (patient?.[0] as AnalysisProviderSlug | undefined) ?? null;
}

export function patientRunPermissionForProvider(
  slug: AnalysisProviderSlug,
): string | null {
  return PATIENT_PROVIDER_RUN_PERMISSIONS[slug] ?? null;
}
