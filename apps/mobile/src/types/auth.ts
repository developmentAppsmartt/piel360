export type Role = 'superadmin' | 'monitor' | 'empresa' | 'doctor' | 'patient';

/** @deprecated Usar isMobileLoginAllowed de mobile-auth-access */
export const MOBILE_ROLES: Role[] = ['patient', 'doctor', 'empresa'];

/** Roles de panel clínico en JWT (no confundir con slugs RBAC de especialidad). */
export type ClinicalPanelRole = 'doctor' | 'empresa';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  empresa?: boolean;
  empresaReferida?: boolean;
  /** Profesionales y empresas: pending | in_review | active | approved | … */
  verificationStatus?: string;
};

/** JWT con acceso al panel clínico (profesional o empresa). */
export function isClinicalPanelRole(
  role: Role | undefined,
): role is ClinicalPanelRole {
  return role === 'doctor' || role === 'empresa';
}

export function isClinicalPanelUser(
  user: Pick<AuthUser, 'role'> | null | undefined,
): boolean {
  return isClinicalPanelRole(user?.role);
}

/** Cuenta doctor con panel clínico completo (no solo perfil). */
export function isDoctorVerificationActive(
  status: string | null | undefined,
): boolean {
  return status === 'active' || status === 'approved';
}

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type LoginPayload = {
  email: string;
  password: string;
};

/** Registro móvil: solo pacientes. */
export type RegisterPatientPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  emailTicket?: string;
};

/** @deprecated Preferir RegisterPatientPayload */
export type RegisterPayload = RegisterPatientPayload & {
  role?: 'patient' | 'doctor';
};
