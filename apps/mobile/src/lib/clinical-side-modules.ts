/**
 * Espejo de `clinical-nav-access` / módulos CRM para el menú móvil.
 * (mobile no importa @piel360/shared)
 */
export const CLINICAL_SIDE_MODULES = [
  {
    id: 'reportes' as const,
    slug: 'clinical.reports',
    label: 'Reportes',
    legacy: ['view_any_analysis', 'view_analysis'],
  },
  {
    id: 'fototipo' as const,
    slug: 'clinical.fitzpatrick_rules',
    label: 'Fototipo',
    legacy: ['view_any_encyclopedia_entry', 'view_encyclopedia_entry'],
  },
  {
    id: 'edad_piel' as const,
    slug: 'clinical.skin_age_rules',
    label: 'Edad de piel',
    legacy: ['view_any_encyclopedia_entry', 'view_encyclopedia_entry'],
  },
  {
    id: 'plantillas' as const,
    slug: 'clinical.email_templates',
    label: 'Plantillas reportes',
    legacy: [
      'view_any_plan',
      'view_plan',
      'view_any_subscription',
      'view_subscription',
    ],
  },
] as const;

export type ClinicalSideModuleId = (typeof CLINICAL_SIDE_MODULES)[number]['id'];

export function userCanAccessClinicalModule(
  permissions: string[] | undefined,
  slug: string,
  legacy: readonly string[],
): boolean {
  if (!permissions?.length) return false;
  const granted = new Set(permissions);
  if (granted.has(slug)) return true;
  return legacy.some((p) => granted.has(p));
}

export function filterVisibleClinicalModules(permissions: string[] | undefined) {
  return CLINICAL_SIDE_MODULES.filter((m) =>
    userCanAccessClinicalModule(permissions, m.slug, m.legacy),
  );
}
