/** Código de error del API cuando la cuenta fue deshabilitada por un admin. */
export const ACCOUNT_DISABLED = "ACCOUNT_DISABLED";

export const ACCOUNT_DISABLED_MESSAGE =
  "Tu cuenta está deshabilitada. Comunícate con soporte para más información.";

/** Días que se conservan los datos analíticos tras vencer una suscripción. */
export const EXPIRED_PLAN_DATA_RETENTION_DAYS = 60;

export type ExpiredPlanInfo = {
  planName: string;
  endedAt: string;
  /** `endedAt` + EXPIRED_PLAN_DATA_RETENTION_DAYS. */
  dataDeletionAt: string;
};

/**
 * Plan consumido mientras la cuenta conserva otro plan vigente: o gastó todos
 * sus análisis (`credits`) o venció por fecha (`expired`).
 */
export type DepletedPlanInfo = {
  subscriptionId: string;
  planName: string;
  reason: "credits" | "expired";
  analysisLimit: number;
  /** Análisis que le quedaban (0 si `credits`). */
  remaining: number;
  /** Fin de vigencia (ISO); `null` si no vence. */
  endsAt: string | null;
  /** Solo `expired`: `endsAt` + EXPIRED_PLAN_DATA_RETENTION_DAYS. */
  dataDeletionAt: string | null;
};

export type AccountStatus = {
  disabled: boolean;
  disabledReason: string | null;
  disabledAt: string | null;
  /** `organization`: el deshabilitado es el dueño de la empresa del usuario. */
  disabledScope: "user" | "organization" | null;
  /** `true` solo para profesionales/empresas verificados sin plan vigente. */
  planRestricted: boolean;
  /** Planes vencidos más recientes (uno por plan) — vacío si nunca tuvo plan. */
  expiredPlans: ExpiredPlanInfo[];
  /** Planes sin créditos o vencidos con otro plan aún vigente (vacío si `planRestricted`). */
  depletedPlans: DepletedPlanInfo[];
};

/** Módulos del CRM que siguen disponibles sin plan activo. */
export const NO_PLAN_ALLOWED_CLINICAL_PREFIXES = [
  "/doctor/home",
  "/doctor/reportes",
  "/doctor/planes",
  "/doctor/soporte",
  /** Retorno del checkout y comprobantes: no aparece en el menú. */
  "/doctor/facturacion",
] as const;

export const NO_PLAN_MENU_HREFS = [
  "/doctor/home",
  "/doctor/reportes",
  "/doctor/planes",
  "/doctor/soporte",
] as const;

export function clinicalPathAllowedWithoutPlan(pathname: string): boolean {
  return NO_PLAN_ALLOWED_CLINICAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
