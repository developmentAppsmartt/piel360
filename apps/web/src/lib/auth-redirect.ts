import { isClinicalPanelRole, isDoctorVerificationActive, type Role } from "@piel360/shared";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  verificationStatus?: string;
  empresa?: boolean;
  empresaReferida?: boolean;
}

const PANEL_HOME: Record<Role, string> = {
  superadmin: "/admin",
  monitor: "/admin",
  empresa: "/doctor/home",
  doctor: "/doctor/home",
  patient: "/patient/dashboard",
};

export function homeForUser(user: AuthUser): string {
  if (user.role === "monitor") return "/admin/verificacion";
  if (
    isClinicalPanelRole(user.role) &&
    !isDoctorVerificationActive(user.verificationStatus)
  ) {
    return "/doctor/home";
  }
  return PANEL_HOME[user.role] ?? PANEL_HOME.doctor;
}
