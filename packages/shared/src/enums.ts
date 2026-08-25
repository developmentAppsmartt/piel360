/**
 * Espejo del enum `SubscriptionStatus` de prisma/schema.prisma (apps/api).
 * Único origen de verdad para el schema: MIGRACION.md §7.1.
 */
export const SUBSCRIPTION_STATUSES = ["pending", "active", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Nivel de riesgo devuelto por Skiniver en `topn[].risk_level` (INTEGRACIONES-IA.md §1.3). */
export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Roles del sistema (RBAC). Empresa / empresa referida son flags en Doctor, no roles. */
export const ROLES = ["superadmin", "monitor", "doctor", "patient"] as const;
export type Role = (typeof ROLES)[number];

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

/**
 * Permisos granulares del rol monitor (Moderator.permissions).
 * Sección A — Gestión de profesionales / verificación.
 */
export const MODERATOR_PERMISSIONS = [
  "view_registered_professionals",
  "view_pending_requests",
  "view_personal_info",
  "view_email_phone",
  "view_specialty",
  "view_license",
  "view_education_institution",
  "view_attached_documents",
  "download_documents",
  "review_document_validity",
  "compare_info_vs_documents",
  "request_corrections",
  "add_observations",
  "approve_professional",
  "reject_professional",
  "suspend_validation",
  "change_specialty",
  "edit_personal_data",
  "delete_user",
] as const;

export type ModeratorPermission = (typeof MODERATOR_PERMISSIONS)[number];

export const MODERATOR_PERMISSION_LABELS: Record<ModeratorPermission, string> =
  {
    view_registered_professionals: "Ver profesionales registrados",
    view_pending_requests: "Ver solicitudes pendientes",
    view_personal_info: "Ver información personal",
    view_email_phone: "Ver correo y teléfono",
    view_specialty: "Ver profesión/especialidad",
    view_license: "Ver número de licencia/tarjeta profesional",
    view_education_institution: "Ver institución educativa",
    view_attached_documents: "Ver documentos adjuntos",
    download_documents: "Descargar documentos",
    review_document_validity: "Revisar vigencia de documentos",
    compare_info_vs_documents: "Comparar información vs documentos",
    request_corrections: "Solicitar correcciones",
    add_observations: "Agregar observaciones",
    approve_professional: "Aprobar profesional",
    reject_professional: "Rechazar profesional",
    suspend_validation: "Suspender validación",
    change_specialty: "Cambiar profesión",
    edit_personal_data: "Editar datos personales",
    delete_user: "Eliminar usuario",
  };

/** Por defecto: todo lo de verificación, sin editar datos / profesión / eliminar. */
export const DEFAULT_MODERATOR_PERMISSIONS: readonly ModeratorPermission[] = [
  "view_registered_professionals",
  "view_pending_requests",
  "view_personal_info",
  "view_email_phone",
  "view_specialty",
  "view_license",
  "view_education_institution",
  "view_attached_documents",
  "download_documents",
  "review_document_validity",
  "compare_info_vs_documents",
  "request_corrections",
  "add_observations",
  "approve_professional",
  "reject_professional",
  "suspend_validation",
];

/** Roles con acceso al panel clínico `/doctor` (web y mobile). */
export const DOCTOR_PANEL_ROLES: readonly Role[] = ["doctor"];
