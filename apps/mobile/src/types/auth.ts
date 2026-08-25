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
};

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
