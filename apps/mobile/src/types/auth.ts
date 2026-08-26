export type Role = 'superadmin' | 'monitor' | 'doctor' | 'patient';

/** Roles que pueden usar la app móvil. */
export const MOBILE_ROLES: Role[] = ['patient', 'doctor'];

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  empresa?: boolean;
  empresaReferida?: boolean;
  /** Solo doctores: pending | in_review | active | approved | … */
  verificationStatus?: string;
};

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

/** Registro móvil: solo pacientes. `emailTicket` opcional (OTP no integrado). */
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
