import {
  TEAM_MEMBER_PERMISSIONS,
  type TeamMemberPermission,
} from "./enums.js";

/** Módulos clínicos (`clinical.*`) controlados por cada permiso de equipo. */
export const TEAM_PERMISSION_CLINICAL_MODULES: Record<
  TeamMemberPermission,
  readonly string[]
> = {
  patients: ["clinical.patients"],
  analyses: ["clinical.analyses"],
  products: ["clinical.products"],
  routines: ["clinical.routines"],
  treatments: ["clinical.routines"],
  billing: ["clinical.plans", "clinical.billing", "clinical.consumption"],
  reports: ["clinical.reports"],
};

const CLINICAL_SLUG_TO_TEAM_MODULE = new Map<string, TeamMemberPermission>();
for (const [module, slugs] of Object.entries(TEAM_PERMISSION_CLINICAL_MODULES)) {
  for (const slug of slugs) {
    CLINICAL_SLUG_TO_TEAM_MODULE.set(slug, module as TeamMemberPermission);
  }
}

/** Slugs clínicos visibles sin permiso de equipo explícito (cuenta / soporte). */
const TEAM_ALWAYS_VISIBLE_CLINICAL_SLUGS = new Set([
  "clinical.home",
  "clinical.settings",
  "clinical.settings.account",
  "clinical.support",
]);

const TEAM_MAPS_CLINICAL_PREFIXES = ["clinical.maps"];

export function parseTeamMemberPermissions(raw: unknown): TeamMemberPermission[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(TEAM_MEMBER_PERMISSIONS);
  return raw.filter(
    (item): item is TeamMemberPermission =>
      typeof item === "string" && allowed.has(item),
  );
}

export function teamPermissionAllowsClinicalSlug(
  teamPermissions: TeamMemberPermission[] | undefined,
  clinicalSlug: string,
  options?: { isOrgMember?: boolean },
): boolean {
  if (!options?.isOrgMember) return true;
  if (!teamPermissions) return false;

  if (TEAM_ALWAYS_VISIBLE_CLINICAL_SLUGS.has(clinicalSlug)) return true;

  if (TEAM_MAPS_CLINICAL_PREFIXES.some((prefix) => clinicalSlug.startsWith(prefix))) {
    return (
      teamPermissions.includes("patients") || teamPermissions.includes("analyses")
    );
  }

  const module = CLINICAL_SLUG_TO_TEAM_MODULE.get(clinicalSlug);
  if (!module) return true;
  return teamPermissions.includes(module);
}

export function teamPermissionAllowsNavHref(
  teamPermissions: TeamMemberPermission[] | undefined,
  href: string,
  options?: { isOrgMember?: boolean },
): boolean {
  if (!options?.isOrgMember) return true;
  if (!href.startsWith("/doctor")) return true;

  if (href.startsWith("/doctor/productos")) {
    return teamPermissions?.includes("products") ?? false;
  }
  if (href.startsWith("/doctor/rutinas")) {
    return (
      (teamPermissions?.includes("routines") ||
        teamPermissions?.includes("treatments")) ??
      false
    );
  }
  if (
    href.startsWith("/doctor/planes") ||
    href.startsWith("/doctor/facturacion") ||
    href.startsWith("/doctor/consumo")
  ) {
    return teamPermissions?.includes("billing") ?? false;
  }
  if (href.startsWith("/doctor/analisis")) {
    return teamPermissions?.includes("analyses") ?? false;
  }
  if (href.startsWith("/doctor/pacientes")) {
    return teamPermissions?.includes("patients") ?? false;
  }
  if (href.startsWith("/doctor/reportes")) {
    return teamPermissions?.includes("reports") ?? false;
  }

  return true;
}
