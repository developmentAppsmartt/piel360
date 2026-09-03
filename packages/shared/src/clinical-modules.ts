/** Módulos del panel clínico (`/doctor`) y permisos que controlan cada uno. */

export type ClinicalModuleDef = {
  key: string;
  label: string;
  href: string;
  sortOrder: number;
  /** Al menos uno de estos permisos hace visible el módulo en el menú. */
  permissionNames: readonly string[];
  note?: string;
};

export const CLINICAL_MODULES: readonly ClinicalModuleDef[] = [
  {
    key: "clinical.maps_doctors",
    label: "Mapas · Médicos",
    href: "/doctor/mapas/medicos",
    sortOrder: 20,
    permissionNames: ["view_any_doctor", "view_doctor"],
  },
  {
    key: "clinical.maps_patients",
    label: "Mapas · Pacientes",
    href: "/doctor/mapas/pacientes",
    sortOrder: 21,
    permissionNames: ["view_any_patient", "view_patient"],
  },
  {
    key: "clinical.patients",
    label: "Pacientes",
    href: "/doctor/pacientes",
    sortOrder: 30,
    permissionNames: [
      "view_any_patient",
      "view_patient",
      "create_patient",
      "update_patient",
    ],
  },
  {
    key: "clinical.analyses",
    label: "Análisis y resultados",
    href: "/doctor/analisis",
    sortOrder: 40,
    permissionNames: [
      "view_any_analysis",
      "view_analysis",
      "create_analysis",
      "use_provider_skiniver",
      "use_provider_youcam",
      "use_provider_fitzpatrick",
    ],
  },
  {
    key: "clinical.plans",
    label: "Planes y suscripciones",
    href: "/doctor/planes",
    sortOrder: 50,
    permissionNames: ["view_any_plan", "view_plan"],
  },
  {
    key: "clinical.consumption",
    label: "Consumo de análisis",
    href: "/doctor/consumo",
    sortOrder: 60,
    permissionNames: ["view_any_analysis_consumption", "view_analysis_consumption"],
  },
  {
    key: "clinical.billing",
    label: "Compras y facturación",
    href: "/doctor/facturacion",
    sortOrder: 70,
    permissionNames: ["view_any_subscription", "view_subscription"],
  },
  {
    key: "clinical.reports",
    label: "Reportes",
    href: "/doctor/reportes",
    sortOrder: 80,
    permissionNames: ["view_any_analysis", "view_analysis"],
  },
  {
    key: "clinical.products",
    label: "Productos",
    href: "/doctor/productos",
    sortOrder: 90,
    permissionNames: ["view_any_patient", "view_patient"],
  },
  {
    key: "clinical.routines",
    label: "Rutinas y tratamientos",
    href: "/doctor/rutinas",
    sortOrder: 100,
    permissionNames: ["view_any_encyclopedia_entry", "view_encyclopedia_entry"],
  },
  {
    key: "clinical.skin_age_rules",
    label: "Reglas por edad de piel",
    href: "/doctor/reglas-edad-piel",
    sortOrder: 101,
    permissionNames: ["view_any_encyclopedia_entry", "view_encyclopedia_entry"],
  },
  {
    key: "clinical.email_templates",
    label: "Plantillas de correo",
    href: "/doctor/plantillas-correo",
    sortOrder: 102,
    permissionNames: ["view_any_plan", "view_plan", "view_any_subscription", "view_subscription"],
  },
  {
    key: "clinical.team",
    label: "Configuración · Equipo",
    href: "/doctor/configuracion/equipos",
    sortOrder: 110,
    permissionNames: ["view_organization", "create_organization", "update_organization"],
    note: "También requiere cuenta empresa (doctor.empresa = true).",
  },
] as const;

export const CLINICAL_MENU_PERMISSION_NAMES = new Set(
  CLINICAL_MODULES.flatMap((module) => module.permissionNames),
);

export function clinicalModuleByHref(href: string): ClinicalModuleDef | undefined {
  return CLINICAL_MODULES.find((module) => module.href === href);
}
