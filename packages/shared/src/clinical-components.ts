/** Componentes del panel clínico — catálogo canónico para permisos RBAC (rutas bajo /doctor hoy). */

export type ClinicalComponentDef = {
  slug: string;
  label: string;
  href: string;
  sortOrder: number;
  parentSlug?: string;
  isActive?: boolean;
};

export const CLINICAL_COMPONENTS: readonly ClinicalComponentDef[] = [
  { slug: "clinical.home", label: "Inicio", href: "/doctor/home", sortOrder: 10 },
  { slug: "clinical.maps", label: "Mapas", href: "/doctor/mapas", sortOrder: 20 },
  {
    slug: "clinical.maps.doctors",
    label: "Mapas · Médicos",
    href: "/doctor/mapas/medicos",
    sortOrder: 21,
    parentSlug: "clinical.maps",
  },
  {
    slug: "clinical.maps.patients",
    label: "Mapas · Pacientes",
    href: "/doctor/mapas/pacientes",
    sortOrder: 22,
    parentSlug: "clinical.maps",
  },
  { slug: "clinical.patients", label: "Pacientes", href: "/doctor/pacientes", sortOrder: 30 },
  {
    slug: "clinical.analyses",
    label: "Análisis y resultados",
    href: "/doctor/analisis",
    sortOrder: 40,
  },
  {
    slug: "clinical.plans",
    label: "Planes y suscripciones",
    href: "/doctor/planes",
    sortOrder: 50,
  },
  {
    slug: "clinical.consumption",
    label: "Consumo de análisis",
    href: "/doctor/consumo",
    sortOrder: 60,
  },
  {
    slug: "clinical.billing",
    label: "Compras y facturación",
    href: "/doctor/facturacion",
    sortOrder: 70,
  },
  { slug: "clinical.reports", label: "Reportes", href: "/doctor/reportes", sortOrder: 80 },
  { slug: "clinical.products", label: "Productos", href: "/doctor/productos", sortOrder: 90 },
  {
    slug: "clinical.routines",
    label: "Rutinas y tratamientos",
    href: "/doctor/rutinas",
    sortOrder: 100,
  },
  {
    slug: "clinical.skin_age_rules",
    label: "Reglas por edad de piel",
    href: "/doctor/reglas-edad-piel",
    sortOrder: 101,
  },
  {
    slug: "clinical.email_templates",
    label: "Plantillas de correo",
    href: "/doctor/plantillas-correo",
    sortOrder: 102,
  },
  {
    slug: "clinical.settings",
    label: "Configuración",
    href: "/doctor/configuracion",
    sortOrder: 110,
  },
  {
    slug: "clinical.settings.account",
    label: "Cuenta",
    href: "/doctor/configuracion",
    sortOrder: 111,
    parentSlug: "clinical.settings",
  },
  {
    slug: "clinical.settings.team",
    label: "Equipo",
    href: "/doctor/configuracion/equipos",
    sortOrder: 112,
    parentSlug: "clinical.settings",
  },
  {
    slug: "clinical.settings.referrals",
    label: "Referidos",
    href: "/doctor/configuracion/referidos",
    sortOrder: 113,
    parentSlug: "clinical.settings",
  },
  { slug: "clinical.support", label: "Soporte", href: "/doctor/soporte", sortOrder: 120 },
] as const;

/** Slugs de componentes clínicos por defecto para el rol `empresa`. */
export const EMPRESA_CLINICAL_COMPONENT_SLUGS = [
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
  "clinical.settings.team",
  "clinical.support",
] as const;

export function clinicalComponentByHref(href: string): ClinicalComponentDef | undefined {
  return CLINICAL_COMPONENTS.find((component) => component.href === href);
}
