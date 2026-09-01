import { adminNav } from "@/app/admin/(panel)/nav-config";
import { doctorNav } from "@/app/doctor/(panel)/nav-config";
import {
  filterNavByFeatures,
  type NavFeatures,
  type NavItem,
} from "@/components/layout/nav-items";

function isClinicalNavItem(item: NavItem): boolean {
  return (
    item.href.startsWith("/doctor") ||
    (item.permissionsAny?.some((permission) => permission.startsWith("clinical.")) ??
      false)
  );
}

/**
 * Menú unificado: muestra todos los módulos (admin + clínico) que el rol tenga
 * asignados, sin depender del panel (/admin vs /doctor).
 */
export function buildUnifiedPanelNav(features: NavFeatures): NavItem[] {
  const clinical = filterNavByFeatures(doctorNav, features, {
    verificationGate: true,
  });
  const admin = filterNavByFeatures(adminNav, features, {
    verificationGate: false,
  });

  const merged: NavItem[] = [];
  const seen = new Set<string>();

  for (const item of [...clinical, ...admin]) {
    const permissionKey =
      item.permissionsAny?.[0] ?? `${item.href}::${item.label}`;
    if (seen.has(permissionKey)) continue;
    seen.add(permissionKey);
    merged.push(item);
  }

  return merged;
}

export function navItemScope(item: NavItem): "clinical" | "admin" {
  return isClinicalNavItem(item) ? "clinical" : "admin";
}
