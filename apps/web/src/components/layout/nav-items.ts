import type { LucideIcon } from "lucide-react";
import {
  isClinicalPanelRole,
  isDoctorVerificationActive,
  teamPermissionAllowsClinicalSlug,
  teamPermissionAllowsNavHref,
  type Role,
  type TeamMemberPermission,
} from "@piel360/shared";
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
  /** Permisos de módulo del equipo empresa (solo miembros invitados). */
  teamPermissions?: TeamMemberPermission[] | null;
  isOrgMember?: boolean;
};

function isClinicalNavItem(item: NavItem): boolean {
  return (
    item.href.startsWith("/doctor") ||
    (item.permissionsAny?.some((permission) => permission.startsWith("clinical.")) ??
      false)
  );
}

export function filterNavByFeatures(
  items: NavItem[],
  features: NavFeatures,
  options?: { verificationGate?: boolean },
): NavItem[] {
  const verificationGate = options?.verificationGate ?? true;
  const clinicalPanel = isClinicalPanelRole(features.role);
  const doctorActive =
    !clinicalPanel ||
    isDoctorVerificationActive(features.verificationStatus);

  function itemPassesFilters(item: NavItem): boolean {
    if (item.roles && !item.roles.includes(features.role)) return false;

    const clinicalItem = isClinicalNavItem(item);
    const skipPermissionCheck =
      verificationGate &&
      clinicalItem &&
      clinicalPanel &&
      !doctorActive &&
      item.allowedWhilePending;

    if (item.permissionsAny?.length && !skipPermissionCheck) {
      if (!hasAnyPermission(features.permissions, item.permissionsAny)) return false;
      const clinicalSlug = item.permissionsAny[0];
      if (
        clinicalSlug?.startsWith("clinical.") &&
        !teamPermissionAllowsClinicalSlug(features.teamPermissions ?? undefined, clinicalSlug, {
          isOrgMember: features.isOrgMember,
        })
      ) {
        return false;
      }
    }
    if (
      features.isOrgMember &&
      !teamPermissionAllowsNavHref(features.teamPermissions ?? undefined, item.href, {
        isOrgMember: true,
      })
    ) {
      return false;
    }
    if (item.requiresEmpresa && !features.empresa) return false;
    if (item.requiresEmpresaReferida && !features.empresaReferida) return false;

    if (
      verificationGate &&
      clinicalItem &&
      clinicalPanel &&
      !doctorActive &&
      !item.allowedWhilePending
    ) {
      return false;
    }

    return true;
  }

  return items
    .map((item) => {
      if (!item.children?.length) {
        return itemPassesFilters(item) ? item : null;
      }

      const children = filterNavByFeatures(item.children, features, options);
      if (children.length === 0 && !itemPassesFilters(item)) return null;
      return { ...item, children };
    })
    .filter((item): item is NavItem => item !== null);
}

/** @deprecated Preferir filterNavByFeatures */
export function filterNavByRole(items: NavItem[], role: Role): NavItem[] {
  return filterNavByFeatures(items, { role });
}
