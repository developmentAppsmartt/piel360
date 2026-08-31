import { ADMIN_COMPONENTS } from "@piel360/shared";
import { hasAnyPermission } from "@/lib/doctor-panel-permissions";

export { hasAnyPermission };

const ADMIN_ROUTE_RULES = [...ADMIN_COMPONENTS]
  .map((component) => ({
    prefix: component.href,
    anyOf: [component.slug] as const,
  }))
  .sort((a, b) => b.prefix.length - a.prefix.length);

/** Ruta del panel admin → requiere slug del componente asignado al rol. */
export function adminRouteAllowed(
  pathname: string,
  userPermissions: string[] | undefined,
): boolean {
  if (pathname === "/admin" || pathname === "/admin/login") return true;

  const rule = ADMIN_ROUTE_RULES.find(
    (entry) =>
      pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  if (!rule) return true;
  return hasAnyPermission(userPermissions, rule.anyOf);
}

/** Slug del componente admin para un ítem de navegación. */
export function adminNavPermission(href: string): readonly string[] {
  const component = ADMIN_COMPONENTS.find((entry) => entry.href === href);
  return component ? [component.slug] : [];
}
