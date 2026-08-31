/** Permisos RBAC requeridos para secciones del panel doctor (JWT `permissions`). */

export const DOCTOR_PANEL_ACCESS = {
  mapsDoctors: ["view_any_doctor", "view_doctor"],
  mapsPatients: ["view_any_patient", "view_patient"],
  patients: ["view_any_patient", "view_patient", "create_patient", "update_patient"],
  analyses: [
    "view_any_analysis",
    "view_analysis",
    "create_analysis",
    "use_provider_skiniver",
    "use_provider_youcam",
    "use_provider_fitzpatrick",
  ],
  plans: ["view_any_plan", "view_plan"],
  consumption: ["view_any_analysis_consumption", "view_analysis_consumption"],
  billing: ["view_any_subscription", "view_subscription"],
  reports: ["view_any_analysis", "view_analysis"],
  products: ["view_any_patient", "view_patient"],
  routines: ["view_any_encyclopedia_entry", "view_encyclopedia_entry"],
} as const;

export type DoctorPanelAccessKey = keyof typeof DOCTOR_PANEL_ACCESS;

export function hasAnyPermission(
  userPermissions: string[] | undefined,
  required: readonly string[],
): boolean {
  if (required.length === 0) return true;
  if (!userPermissions?.length) return false;
  const set = new Set(userPermissions);
  return required.some((permission) => set.has(permission));
}

/** Rutas del panel doctor → permisos (cualquiera basta). Orden: prefijos más largos primero. */
export const DOCTOR_ROUTE_RULES: { prefix: string; anyOf: readonly string[] }[] = [
  { prefix: "/doctor/mapas/medicos", anyOf: DOCTOR_PANEL_ACCESS.mapsDoctors },
  { prefix: "/doctor/mapas/pacientes", anyOf: DOCTOR_PANEL_ACCESS.mapsPatients },
  { prefix: "/doctor/pacientes", anyOf: DOCTOR_PANEL_ACCESS.patients },
  { prefix: "/doctor/analisis", anyOf: DOCTOR_PANEL_ACCESS.analyses },
  { prefix: "/doctor/planes", anyOf: DOCTOR_PANEL_ACCESS.plans },
  { prefix: "/doctor/consumo", anyOf: DOCTOR_PANEL_ACCESS.consumption },
  { prefix: "/doctor/facturacion", anyOf: DOCTOR_PANEL_ACCESS.billing },
  { prefix: "/doctor/reportes", anyOf: DOCTOR_PANEL_ACCESS.reports },
  { prefix: "/doctor/productos", anyOf: DOCTOR_PANEL_ACCESS.products },
  { prefix: "/doctor/rutinas", anyOf: DOCTOR_PANEL_ACCESS.routines },
  { prefix: "/doctor/mapas", anyOf: [...DOCTOR_PANEL_ACCESS.mapsDoctors, ...DOCTOR_PANEL_ACCESS.mapsPatients] },
];

const DOCTOR_ROUTE_RULES_SORTED = [...DOCTOR_ROUTE_RULES].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

export function doctorRouteAllowed(
  pathname: string,
  userPermissions: string[] | undefined,
): boolean {
  if (pathname === "/doctor" || pathname === "/doctor/home") return true;
  if (pathname.startsWith("/doctor/soporte")) return true;
  if (pathname === "/doctor/configuracion") return true;
  if (pathname.startsWith("/doctor/configuracion/equipos")) return true;
  if (pathname.startsWith("/doctor/configuracion/referidos")) return true;

  const rule = DOCTOR_ROUTE_RULES_SORTED.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  if (!rule) return true;
  return hasAnyPermission(userPermissions, rule.anyOf);
}
