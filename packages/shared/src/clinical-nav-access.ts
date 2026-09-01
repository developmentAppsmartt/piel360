/**
 * Permisos que conceden acceso a un módulo clínico además del slug `clinical.*`.
 * Compatibilidad con roles como `empresa` que tienen acciones API (`view_any_patient`, …)
 * sin slugs de componente en BD.
 */
export const CLINICAL_MODULE_LEGACY_ACTIONS: Record<string, readonly string[]> = {
  "clinical.home": [
    "view_any_patient",
    "view_any_doctor",
    "view_any_analysis",
    "view_any_plan",
    "view_organization",
  ],
  "clinical.maps": [
    "view_any_doctor",
    "view_doctor",
    "view_any_patient",
    "view_patient",
  ],
  "clinical.maps.doctors": ["view_any_doctor", "view_doctor"],
  "clinical.maps.patients": ["view_any_patient", "view_patient"],
  "clinical.patients": [
    "view_any_patient",
    "view_patient",
    "create_patient",
    "update_patient",
  ],
  "clinical.analyses": [
    "view_any_analysis",
    "view_analysis",
    "create_analysis",
    "use_provider_skiniver",
    "use_provider_youcam",
    "use_provider_fitzpatrick",
  ],
  "clinical.plans": ["view_any_plan", "view_plan", "view_any_subscription", "view_subscription"],
  "clinical.consumption": [
    "view_any_analysis_consumption",
    "view_analysis_consumption",
  ],
  "clinical.billing": ["view_any_subscription", "view_subscription"],
  "clinical.reports": ["view_any_analysis", "view_analysis"],
  "clinical.products": ["view_any_patient", "view_patient"],
  "clinical.routines": ["view_any_encyclopedia_entry", "view_encyclopedia_entry"],
  "clinical.settings": ["view_organization", "view_doctor", "update_doctor"],
  "clinical.settings.account": ["view_organization", "view_doctor", "update_doctor"],
  "clinical.settings.team": [
    "view_organization",
    "create_organization",
    "update_organization",
  ],
  "clinical.settings.referrals": ["view_organization"],
  "clinical.support": [],
};

/** Slug del módulo + acciones legacy que también abren ese ítem de menú. */
export function clinicalModulePermissions(slug: string): readonly string[] {
  const legacy = CLINICAL_MODULE_LEGACY_ACTIONS[slug] ?? [];
  return [slug, ...legacy];
}

export function userCanAccessClinicalModule(
  userPermissions: string[] | undefined,
  slug: string,
): boolean {
  if (!userPermissions?.length) return false;
  const required = clinicalModulePermissions(slug);
  if (required.length === 0) return true;
  const granted = new Set(userPermissions);
  return required.some((permission) => granted.has(permission));
}
