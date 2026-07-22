export type Role = 'admin' | 'doctor' | 'patient';

/** Roles que pueden usar la app móvil. */
export const MOBILE_ROLES: Role[] = ['patient', 'doctor'];

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
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

/** Registro móvil: solo pacientes (requiere ticket OTP). */
export type RegisterPatientPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  emailTicket: string;
};

/** @deprecated Preferir RegisterPatientPayload */
export type RegisterPayload = RegisterPatientPayload & {
  role?: 'patient' | 'doctor';
};
