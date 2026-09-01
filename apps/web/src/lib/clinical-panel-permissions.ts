import { CLINICAL_COMPONENTS } from "@piel360/shared";
import { hasAnyPermission } from "@/lib/doctor-panel-permissions";

export { hasAnyPermission };

const CLINICAL_ROUTE_RULES = [...CLINICAL_COMPONENTS]
  .map((component) => ({
    prefix: component.href,
    slug: component.slug,
  }))
  .sort((a, b) => b.prefix.length - a.prefix.length);

/** Solo el slug `clinical.*` asignado al rol en la matriz (checkbox). */
export function clinicalNavPermission(slug: string): readonly string[] {
  return [slug];
}

/** Ruta del panel clínico → requiere el slug del componente marcado en el rol. */
export function clinicalRouteAllowed(
  pathname: string,
  userPermissions: string[] | undefined,
): boolean {
  if (
    pathname === "/doctor" ||
    pathname === "/doctor/home" ||
    pathname.startsWith("/doctor/soporte")
  ) {
    return true;
  }
  if (pathname === "/doctor/configuracion") {
    return hasAnyPermission(userPermissions, ["clinical.settings", "clinical.settings.account"]);
  }
  if (pathname.startsWith("/doctor/configuracion/equipos")) {
    return hasAnyPermission(userPermissions, ["clinical.settings.team"]);
  }
  if (pathname.startsWith("/doctor/configuracion/referidos")) {
    return hasAnyPermission(userPermissions, ["clinical.settings.referrals"]);
  }

  const matchingRules = CLINICAL_ROUTE_RULES.filter(
    (entry) =>
      pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  if (matchingRules.length === 0) return false;
  return matchingRules.some((rule) =>
    hasAnyPermission(userPermissions, [rule.slug]),
  );
}
