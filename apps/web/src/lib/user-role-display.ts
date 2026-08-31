import {
  isClinicalPanelRole,
  isDoctorVerificationActive,
  type Role,
} from "@piel360/shared";
import { planRoleLabel } from "@/lib/plan-roles";

const PANEL_ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  monitor: "Moderador",
  empresa: "Empresa",
  doctor: "Profesional",
  patient: "Paciente",
};

function specialtyToLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const fromPlan = planRoleLabel(trimmed);
  if (fromPlan !== trimmed) return fromPlan;
  return trimmed;
}

export function resolveRoleDisplayLabel(
  role: Role,
  options?: {
    specialty?: string | null;
    empresa?: boolean;
  },
): string {
  if (role === "empresa" || options?.empresa) return "Empresa";
  if (role === "patient") return PANEL_ROLE_LABELS.patient;
  if (role === "superadmin") return PANEL_ROLE_LABELS.superadmin;
  if (role === "monitor") return PANEL_ROLE_LABELS.monitor;

  if (isClinicalPanelRole(role)) {
    const fromSpecialty = specialtyToLabel(options?.specialty ?? "");
    if (fromSpecialty) return fromSpecialty;
    return PANEL_ROLE_LABELS.doctor;
  }

  return PANEL_ROLE_LABELS[role] ?? role;
}

export function resolveRoleScopeLabel(
  role: Role,
  options?: {
    empresa?: boolean;
    empresaReferida?: boolean;
    verificationStatus?: string | null;
  },
): string {
  if (
    isClinicalPanelRole(role) &&
    !isDoctorVerificationActive(options?.verificationStatus)
  ) {
    return "Verificación pendiente";
  }
  if (options?.empresaReferida) return "Empresa referida";
  if (role === "empresa" || options?.empresa) return "Empresa";
  if (role === "doctor") return "Consulta individual";
  if (role === "patient") return "Paciente";
  if (role === "monitor") return "Verificación";
  if (role === "superadmin") return "Global";
  return "";
}

export function formatClinicalGreeting(
  role: Role,
  firstName: string,
  lastName: string,
  options?: { specialty?: string | null; empresa?: boolean },
): string {
  const fullName = `${firstName} ${lastName}`.trim();
  const roleLabel = resolveRoleDisplayLabel(role, options);
  if (isClinicalPanelRole(role) || role === "empresa") {
    return `${roleLabel} ${fullName}`.trim();
  }
  return fullName;
}
