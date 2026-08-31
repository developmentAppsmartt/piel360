import type { AdminUser } from "@/lib/queries/users";
import { planRoleLabel } from "@/lib/plan-roles";
import { resolveUserAccountKind } from "@/lib/user-account-kind";

const SYSTEM_ROLE_SLUGS = new Set([
  "superadmin",
  "monitor",
  "empresa",
  "doctor",
  "patient",
]);

export type ProfessionalSegment = {
  key: string;
  label: string;
  count: number;
};

function slugToLabel(slug: string): string {
  return slug
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function roleLabel(slug: string): string {
  const fromPlan = planRoleLabel(slug);
  if (fromPlan !== slug) return fromPlan;
  return slugToLabel(slug);
}

/** Cuenta clínica individual (no empresa). */
export function isProfessionalUser(user: AdminUser): boolean {
  return resolveUserAccountKind(user) === "profesional";
}

/** Cuenta empresarial (owner o representante). */
export function isEmpresaUser(user: AdminUser): boolean {
  return resolveUserAccountKind(user) === "empresa";
}

/** Pestaña «Profesionales»: cuentas clínicas (profesionales + empresas). */
export function matchesProfessionalTab(user: AdminUser): boolean {
  const kind = resolveUserAccountKind(user);
  return kind === "profesional" || kind === "empresa";
}

export function professionalSegmentForUser(user: AdminUser): ProfessionalSegment | null {
  const kind = resolveUserAccountKind(user);
  if (kind === "empresa") {
    return { key: "empresa", label: "Empresas", count: 0 };
  }
  if (kind !== "profesional") return null;

  const specialtyRole = user.roles.find((role) => !SYSTEM_ROLE_SLUGS.has(role.name));
  if (specialtyRole) {
    return {
      key: specialtyRole.name,
      label: roleLabel(specialtyRole.name),
      count: 0,
    };
  }

  const specialtyName = user.doctor?.specialty?.trim();
  if (specialtyName) {
    return {
      key: `specialty:${specialtyName}`,
      label: specialtyName,
      count: 0,
    };
  }

  return { key: "sin_especialidad", label: "Sin especialidad", count: 0 };
}

export function buildProfessionalSegments(users: AdminUser[]): ProfessionalSegment[] {
  const counts = new Map<string, ProfessionalSegment>();

  for (const user of users) {
    const segment = professionalSegmentForUser(user);
    if (!segment) continue;
    const existing = counts.get(segment.key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(segment.key, { ...segment, count: 1 });
    }
  }

  return Array.from(counts.values()).sort((a, b) => {
    if (a.key === "empresa") return -1;
    if (b.key === "empresa") return 1;
    if (a.key === "sin_especialidad") return 1;
    if (b.key === "sin_especialidad") return -1;
    return b.count - a.count || a.label.localeCompare(b.label, "es");
  });
}

export function professionalAndEmpresaTotal(users: AdminUser[]): number {
  return users.filter(matchesProfessionalTab).length;
}
