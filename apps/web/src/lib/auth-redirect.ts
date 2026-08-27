import { isDoctorVerificationActive, type Role } from "@piel360/shared";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  verificationStatus?: string;
}

const PANEL_HOME: Record<Role, string> = {
  superadmin: "/admin",
  monitor: "/admin",
  doctor: "/doctor/home",
  patient: "/patient/dashboard",
};

export function homeForUser(user: AuthUser): string {
  if (user.role === "monitor") return "/admin/verificacion";
  if (
    user.role === "doctor" &&
    !isDoctorVerificationActive(user.verificationStatus)
  ) {
    return "/doctor/planes";
  }
  return PANEL_HOME[user.role] ?? PANEL_HOME.doctor;
}
