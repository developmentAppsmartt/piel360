import type { Role } from "./enums.js";
import { isClinicalPanelRole } from "./enums.js";

export const PRIMARY_PANELS = ["admin", "clinical", "patient"] as const;
export type PrimaryPanel = (typeof PRIMARY_PANELS)[number];

/** Home por panel lógico (clinical sigue en /doctor/* por compatibilidad de rutas). */
export const PANEL_HOME_BY_PRIMARY: Record<PrimaryPanel, string> = {
  admin: "/admin",
  clinical: "/doctor/home",
  patient: "/patient/dashboard",
};

export function isPrimaryPanel(value: string | null | undefined): value is PrimaryPanel {
  return value != null && (PRIMARY_PANELS as readonly string[]).includes(value);
}

/** ¿Tiene al menos un módulo admin marcado en la matriz? Solo slugs `admin.*`. */
export function hasAdminModulePermission(permissions: string[] | undefined): boolean {
  return permissions?.some((slug) => slug.startsWith("admin.")) ?? false;
}

/** ¿Tiene al menos un módulo clínico marcado en la matriz? Solo slugs `clinical.*`. */
export function hasClinicalModulePermission(permissions: string[] | undefined): boolean {
  return permissions?.some((slug) => slug.startsWith("clinical.")) ?? false;
}

export function inferPrimaryPanelFromPermissions(
  permissions: string[],
): PrimaryPanel | null {
  const admin = hasAdminModulePermission(permissions);
  const clinical = hasClinicalModulePermission(permissions);
  if (admin && !clinical) return "admin";
  if (clinical && !admin) return "clinical";
  if (admin && clinical) return "clinical";
  return null;
}

export type RolePanelHint = {
  name: string;
  isActive: boolean;
  primaryPanel?: string | null;
};

export function resolveUserPrimaryPanel(
  roles: RolePanelHint[],
  permissions: string[],
  options?: { hasPatientProfile?: boolean },
): PrimaryPanel {
  const activeRoles = roles.filter((role) => role.isActive);
  const roleNames = activeRoles.map((role) => role.name);
  if (roleNames.includes("superadmin") || roleNames.includes("monitor")) {
    return "admin";
  }

  const inferred = inferPrimaryPanelFromPermissions(permissions);
  if (inferred) return inferred;

  const panels = activeRoles
    .map((role) => role.primaryPanel)
    .filter(isPrimaryPanel);

  if (panels.includes("admin")) return "admin";
  if (panels.includes("clinical")) return "clinical";
  if (panels.includes("patient")) return "patient";

  if (options?.hasPatientProfile) return "patient";
  return "clinical";
}

export function homePathForPrimaryPanel(
  primaryPanel: PrimaryPanel,
  options?: { monitor?: boolean; clinicalPending?: boolean },
): string {
  if (primaryPanel === "admin" && options?.monitor) return "/admin/verificacion";
  if (primaryPanel === "clinical" && options?.clinicalPending) return "/doctor/home";
  return PANEL_HOME_BY_PRIMARY[primaryPanel];
}

export function canAccessAdminPanel(
  role: Role | undefined,
  permissions: string[] | undefined,
): boolean {
  if (role === "superadmin" || role === "monitor") return true;
  return hasAdminModulePermission(permissions);
}

export function canAccessClinicalPanel(
  role: Role | undefined,
  permissions: string[] | undefined,
): boolean {
  if (role === "patient") return false;
  if (hasClinicalModulePermission(permissions)) return true;
  if (isClinicalPanelRole(role)) return true;
  return false;
}

export function canAccessPatientPanel(
  role: Role | undefined,
  primaryPanel?: PrimaryPanel,
): boolean {
  if (primaryPanel === "patient") return true;
  return role === "patient";
}
