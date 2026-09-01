import { ADMIN_COMPONENTS } from "@piel360/shared";
import { hasAnyPermission } from "@/lib/doctor-panel-permissions";

export { hasAnyPermission };

const ADMIN_ROUTE_RULES = [...ADMIN_COMPONENTS]
  .map((component) => ({
    prefix: component.href,
    slug: component.slug,
  }))
  .sort((a, b) => b.prefix.length - a.prefix.length);

/** Solo el slug `admin.*` asignado al rol en la matriz (checkbox). */
export function adminNavPermission(slug: string): readonly string[] {
  return [slug];
}

/** Ruta del panel admin → requiere el slug del componente marcado en el rol. */
export function adminRouteAllowed(
  pathname: string,
  userPermissions: string[] | undefined,
): boolean {
  if (pathname === "/admin" || pathname === "/admin/login") return true;

  const matchingRules = ADMIN_ROUTE_RULES.filter(
    (entry) =>
      pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  if (matchingRules.length === 0) return false;
  return matchingRules.some((rule) =>
    hasAnyPermission(userPermissions, [rule.slug]),
  );
}

/** Resuelve slug por href cuando no hay ambigüedad (un solo componente por ruta). */
export function adminNavPermissionByHref(href: string): readonly string[] {
  const matches = ADMIN_COMPONENTS.filter((entry) => entry.href === href);
  if (matches.length === 1) return [matches[0].slug];
  return [];
}
