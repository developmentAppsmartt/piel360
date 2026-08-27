import type { LucideIcon } from "lucide-react";
import { isDoctorVerificationActive, type Role } from "@piel360/shared";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Si se define, el ítem solo aparece para estos roles. */
  roles?: readonly Role[];
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
};

export function filterNavByFeatures(
  items: NavItem[],
  features: NavFeatures,
): NavItem[] {
  const doctorActive =
    features.role !== "doctor" ||
    isDoctorVerificationActive(features.verificationStatus);

  return items
    .filter((item) => {
      if (item.roles && !item.roles.includes(features.role)) return false;
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
      // Si el padre solo existía por hijos y todos se filtraron, ocultarlo
      // salvo que el padre tenga destino útil (p. ej. Configuración → perfil).
      if (item.children && item.children.length === 0 && !item.href) {
        return false;
      }
      return true;
    });
}

/** @deprecated Preferir filterNavByFeatures */
export function filterNavByRole(items: NavItem[], role: Role): NavItem[] {
  return filterNavByFeatures(items, { role });
}
