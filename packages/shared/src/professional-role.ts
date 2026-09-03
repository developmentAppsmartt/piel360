/** Permisos API por defecto para roles de especialidad / técnico (panel clínico). */
export const PROFESSIONAL_ROLE_API_PERMISSIONS = [
  "view_any_doctor",
  "view_doctor",
  "update_doctor",
  "view_any_patient",
  "view_patient",
  "create_patient",
  "update_patient",
  "view_any_analysis",
  "view_analysis",
  "create_analysis",
  "view_any_plan",
  "view_plan",
  "view_any_subscription",
  "view_subscription",
  "view_any_analysis_consumption",
  "view_analysis_consumption",
  "view_any_encyclopedia_entry",
  "view_encyclopedia_entry",
] as const;

/** Módulos clínicos visibles para profesionales antes y después de verificación moderador. */
export const PROFESSIONAL_CLINICAL_COMPONENT_SLUGS = [
  "clinical.home",
  "clinical.maps",
  "clinical.maps.doctors",
  "clinical.maps.patients",
  "clinical.patients",
  "clinical.analyses",
  "clinical.plans",
  "clinical.consumption",
  "clinical.billing",
  "clinical.reports",
  "clinical.products",
  "clinical.routines",
  "clinical.skin_age_rules",
  "clinical.email_templates",
  "clinical.settings",
  "clinical.settings.account",
  "clinical.support",
] as const;

/** Rol y especialidad por defecto al registrarse vía Google (profesional). */
export const OAUTH_DOCTOR_DEFAULT_ROLE = "medico_general";
export const OAUTH_DOCTOR_DEFAULT_SPECIALTY = "Médico general";
