/** Componentes del panel super admin — catálogo canónico para permisos RBAC. */

export type PermissionKind = "action" | "component";
export type PermissionPanel = "admin" | "doctor";

export type AdminComponentDef = {
  slug: string;
  label: string;
  href: string;
  sortOrder: number;
  parentSlug?: string;
  description?: string;
  /** Si false, no aparece en el catálogo ni concede acceso. */
  isActive?: boolean;
};

export const ADMIN_COMPONENTS: readonly AdminComponentDef[] = [
  {
    slug: "admin.dashboard",
    label: "Panel de control",
    href: "/admin",
    sortOrder: 10,
  },
  {
    slug: "admin.verification.pending",
    label: "Verificación (pendientes)",
    href: "/admin/verificacion",
    sortOrder: 21,
    parentSlug: "admin.verification",
  },
  {
    slug: "admin.verification.verified",
    label: "Verificados",
    href: "/admin/verificacion/verificados",
    sortOrder: 22,
    parentSlug: "admin.verification",
  },
  {
    slug: "admin.verification.rejected",
    label: "Rechazados",
    href: "/admin/verificacion/rechazados",
    sortOrder: 23,
    parentSlug: "admin.verification",
  },
  {
    slug: "admin.moderators",
    label: "Moderadores",
    href: "/admin/moderadores",
    sortOrder: 30,
  },
  {
    slug: "admin.maps",
    label: "Mapas",
    href: "/admin/mapa",
    sortOrder: 40,
  },
  {
    slug: "admin.maps.doctors",
    label: "Mapas · Médicos",
    href: "/admin/mapa/medicos",
    sortOrder: 41,
    parentSlug: "admin.maps",
  },
  {
    slug: "admin.maps.patients",
    label: "Mapas · Pacientes",
    href: "/admin/mapa/pacientes",
    sortOrder: 42,
    parentSlug: "admin.maps",
  },
  {
    slug: "admin.companies",
    label: "Empresas",
    href: "/admin/empresas",
    sortOrder: 50,
  },
  {
    slug: "admin.users",
    label: "Usuarios",
    href: "/admin/usuarios",
    sortOrder: 60,
  },
  {
    slug: "admin.unit_wallet",
    label: "Bolsa de unidades",
    href: "/admin/bolsa-unidades",
    sortOrder: 70,
  },
  {
    slug: "admin.plans",
    label: "Planes",
    href: "/admin/planes",
    sortOrder: 80,
  },
  {
    slug: "admin.purchases",
    label: "Compras y transacciones",
    href: "/admin/compras",
    sortOrder: 90,
  },
  {
    slug: "admin.reports",
    label: "Reportes",
    href: "/admin/reportes",
    sortOrder: 100,
  },
  {
    slug: "admin.billing",
    label: "Facturación",
    href: "/admin/facturacion",
    sortOrder: 110,
  },
  {
    slug: "admin.doctors",
    label: "Profesionales",
    href: "/admin/doctores",
    sortOrder: 120,
  },
  {
    slug: "admin.patients",
    label: "Pacientes",
    href: "/admin/pacientes",
    sortOrder: 130,
  },
  {
    slug: "admin.subscriptions",
    label: "Suscripciones",
    href: "/admin/suscripciones",
    sortOrder: 140,
  },
  {
    slug: "admin.analysis_consumption",
    label: "Consumo de análisis",
    href: "/admin/consumo",
    sortOrder: 150,
  },
  {
    slug: "admin.skin_age_rules",
    label: "Reglas por edad de piel",
    href: "/admin/reglas-edad-piel",
    sortOrder: 155,
  },
  {
    slug: "admin.settings",
    label: "Configuración",
    href: "/admin/configuracion",
    sortOrder: 160,
  },
  {
    slug: "admin.settings.professionals",
    label: "Profesionales",
    href: "/admin/especialidades",
    sortOrder: 161,
    parentSlug: "admin.settings",
  },
  {
    slug: "admin.settings.specialties",
    label: "Especialidades",
    href: "/admin/especialidades",
    sortOrder: 162,
    parentSlug: "admin.settings.professionals",
  },
  {
    slug: "admin.settings.labor_technician",
    label: "Técnico laboral",
    href: "/admin/tecnico-laboral",
    sortOrder: 163,
    parentSlug: "admin.settings.professionals",
  },
  {
    slug: "admin.settings.roles",
    label: "Roles y permisos",
    href: "/admin/roles",
    sortOrder: 164,
    parentSlug: "admin.settings",
  },
  {
    slug: "admin.settings.teams",
    label: "Equipos",
    href: "/admin/configuracion/equipos",
    sortOrder: 165,
    parentSlug: "admin.settings",
  },
  {
    slug: "admin.settings.referrals",
    label: "Referidos",
    href: "/admin/configuracion/referidos",
    sortOrder: 166,
    parentSlug: "admin.settings",
  },
  {
    slug: "admin.settings.global",
    label: "Configuración global",
    href: "/admin/configuracion",
    sortOrder: 167,
    parentSlug: "admin.settings",
  },
  {
    slug: "admin.settings.gateways",
    label: "Pasarelas de pago",
    href: "/admin/gateway-configs",
    sortOrder: 168,
    parentSlug: "admin.settings",
  },
  {
    slug: "admin.audit",
    label: "Auditoría",
    href: "/admin/auditoria",
    sortOrder: 170,
  },
  {
    slug: "admin.notifications",
    label: "Notificaciones",
    href: "/admin/notificaciones",
    sortOrder: 180,
  },
  {
    slug: "admin.help",
    label: "Ayuda",
    href: "/admin/ayuda",
    sortOrder: 190,
  },
] as const;

/** Slugs de componentes asignados al rol monitor por defecto. */
export const MONITOR_COMPONENT_SLUGS = [
  "admin.verification.pending",
  "admin.verification.verified",
  "admin.verification.rejected",
] as const;

export function adminComponentByHref(href: string): AdminComponentDef | undefined {
  return ADMIN_COMPONENTS.find((component) => component.href === href);
}
