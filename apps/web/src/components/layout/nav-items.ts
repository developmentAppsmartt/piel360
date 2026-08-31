import type { LucideIcon } from "lucide-react";
import { isClinicalPanelRole, isDoctorVerificationActive, type Role } from "@piel360/shared";
import { hasAnyPermission } from "@/lib/doctor-panel-permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Si se define, el ítem solo aparece para estos roles. */
  roles?: readonly Role[];
  /** Al menos uno de estos permisos RBAC (JWT). Sin definir = visible sin chequeo de permiso. */
  permissionsAny?: readonly string[];
  /** Requiere Doctor.empresa = true (módulo Equipo). */
  requiresEmpresa?: boolean;
  /** Requiere Doctor.empresaReferida = true (módulo Referidos). */
  requiresEmpresaReferida?: boolean;
  /**
   * Visible aunque el doctor aún no esté activo (pending / in_review / …).
   * Sin este flag, el ítem solo aparece con verificationStatus active|approved.
   */
  allowedWhilePending?: boolean;
  /** Clave especial: el shell puede inyectar un contador (p. ej. pendientes). */
  badgeKey?: "pending-verification";
  children?: NavItem[];
}

export type NavFeatures = {
  role: Role;
  empresa?: boolean;
  empresaReferida?: boolean;
  verificationStatus?: string | null;
  /** Permisos RBAC del JWT (unión de roles del usuario). */
  permissions?: string[];
};

export function filterNavByFeatures(
  items: NavItem[],
  features: NavFeatures,
): NavItem[] {
  const clinicalPanel = isClinicalPanelRole(features.role);
  const doctorActive =
    !clinicalPanel ||
    isDoctorVerificationActive(features.verificationStatus);

  return items
    .filter((item) => {
      if (item.roles && !item.roles.includes(features.role)) return false;
      const skipPermissionCheck =
        clinicalPanel &&
        !doctorActive &&
        item.allowedWhilePending;
      if (item.permissionsAny?.length && !skipPermissionCheck) {
        if (!hasAnyPermission(features.permissions, item.permissionsAny)) return false;
      }
      if (item.requiresEmpresa && !features.empresa) return false;
      if (item.requiresEmpresaReferida && !features.empresaReferida)
        return false;
      if (!doctorActive && !item.allowedWhilePending) return false;
      return true;
    })
    .map((item) => {
      if (!item.children?.length) return item;
      return {
        ...item,
        children: filterNavByFeatures(item.children, features),
      };
    })
    .filter((item) => {
      if (item.children && item.children.length === 0) {
        return false;
      }
      return true;
    });
}

/** @deprecated Preferir filterNavByFeatures */
export function filterNavByRole(items: NavItem[], role: Role): NavItem[] {
  return filterNavByFeatures(items, { role });
}
