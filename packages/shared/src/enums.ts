/**
 * Espejo del enum `SubscriptionStatus` de prisma/schema.prisma (apps/api).
 * Único origen de verdad para el schema: MIGRACION.md §7.1.
 */
export const SUBSCRIPTION_STATUSES = ["pending", "active", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Nivel de riesgo devuelto por Skiniver en `topn[].risk_level` (INTEGRACIONES-IA.md §1.3). */
export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Roles del sistema (RBAC). */
export const ROLES = ["superadmin", "monitor", "empresa", "doctor", "patient"] as const;
export type Role = (typeof ROLES)[number];

/** Roles de panel admin que no pueden usar la app móvil. */
export const MOBILE_BLOCKED_ROLES = ["superadmin", "monitor"] as const;

export function isMobileLoginAllowed(role: Role | undefined): boolean {
  if (!role) return false;
  return !(MOBILE_BLOCKED_ROLES as readonly Role[]).includes(role);
}

/** Intención de membresía al registrarse como doctor (activa flags en Doctor). */
export const MEMBERSHIP_TYPES = [
  "solo_doctor",
  "empresa",
  "empresa_aliada",
] as const;
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number];

/** Planes de asientos (equipos) — separado de Plan/Subscription de análisis. */
export const SEAT_PLANS = ["two", "five", "ten", "custom"] as const;
export type SeatPlan = (typeof SEAT_PLANS)[number];

export const SEAT_PLAN_LIMITS: Record<Exclude<SeatPlan, "custom">, number> = {
  two: 2,
  five: 5,
  ten: 10,
};

/** Mapea un cupo numérico al slug de plan de asientos (`two` | `five` | `ten` | `custom`). */
export function seatPlanFromLimit(limit: number): SeatPlan {
  const match = (
    Object.entries(SEAT_PLAN_LIMITS) as [Exclude<SeatPlan, "custom">, number][]
  ).find(([, value]) => value === limit);
  return match?.[0] ?? "custom";
}

/** Estado de validación del doctor (persistencia; flujo UI en fases posteriores). */
export const VERIFICATION_STATUSES = [
  "pending",
  "in_review",
  "verified",
  "approved",
  "active",
  "rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Cuenta doctor con panel clínico completo (no solo planes / facturación / perfil). */
export function isDoctorVerificationActive(
  status: string | null | undefined,
): boolean {
  return status === "active" || status === "approved";
}

/** Tipo de organización. */
export const ORGANIZATION_TYPES = ["empresa", "empresa_aliada"] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const ORGANIZATION_STATUSES = [
  "pending",
  "active",
  "suspended",
] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const ORGANIZATION_MEMBER_ROLES = ["owner", "member"] as const;
export type OrganizationMemberRole =
  (typeof ORGANIZATION_MEMBER_ROLES)[number];

/**
 * Permisos granulares de un médico dentro del equipo (OrganizationMember.permissions).
 * El owner tiene acceso implícito a todo.
 */
export const TEAM_MEMBER_PERMISSIONS = [
  "patients",
  "analyses",
  "products",
  "routines",
  "treatments",
  "billing",
  "reports",
] as const;
export type TeamMemberPermission = (typeof TEAM_MEMBER_PERMISSIONS)[number];

export const TEAM_MEMBER_PERMISSION_LABELS: Record<
  TeamMemberPermission,
  string
> = {
  patients: "Pacientes",
  analyses: "Análisis y resultados",
  products: "Productos",
  routines: "Rutinas",
  treatments: "Tratamientos",
  billing: "Compras y facturación",
  reports: "Reportes",
};

export const DEFAULT_TEAM_MEMBER_PERMISSIONS: readonly TeamMemberPermission[] =
  [...TEAM_MEMBER_PERMISSIONS];

/** Tipo de locación física registrada por el profesional o empresa. */
export const LOCATION_TYPES = [
  "consultorio",
  "spa",
  "clinica",
  "empresa_aliada",
  "laboratorio",
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  consultorio: "Consultorio",
  spa: "Spa / Estética",
  clinica: "Clínica",
  empresa_aliada: "Empresa aliada",
  laboratorio: "Laboratorio",
};

/** Estado de verificación de la dirección geográfica. */
export const ADDRESS_VERIFICATION_STATUSES = [
  "pending",
  "in_review",
  "verified",
] as const;
export type AddressVerificationStatus =
  (typeof ADDRESS_VERIFICATION_STATUSES)[number];

export const ADDRESS_VERIFICATION_METHODS = [
  "visit",
  "google_maps",
  "photo_evidence",
] as const;
export type AddressVerificationMethod =
  (typeof ADDRESS_VERIFICATION_METHODS)[number];

export const ADDRESS_VERIFICATION_METHOD_LABELS: Record<
  AddressVerificationMethod,
  string
> = {
  visit: "Visita",
  google_maps: "Google Maps",
  photo_evidence: "Evidencia foto / video",
};

/** Roles con acceso al panel clínico `/doctor` (web y mobile). */
export const DOCTOR_PANEL_ROLES: readonly Role[] = ["doctor", "empresa"];

export function isClinicalPanelRole(role: Role | undefined): boolean {
  return role != null && (DOCTOR_PANEL_ROLES as readonly Role[]).includes(role);
}
