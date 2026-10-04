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

/** Espejo de `AccountStatus` en @piel360/shared (GET /auth/me/account-status). */
export type ExpiredPlanInfo = {
  planName: string;
  endedAt: string;
  dataDeletionAt: string;
};

export type AccountStatus = {
  disabled: boolean;
  disabledReason: string | null;
  disabledAt: string | null;
  disabledScope: 'user' | 'organization' | null;
  /** Profesional verificado sin plan vigente: menú limitado. */
  planRestricted: boolean;
  expiredPlans: ExpiredPlanInfo[];
  /** Planes vigentes que consumieron todos sus análisis. */
  depletedPlans?: DepletedPlanInfo[];
};

export type DepletedPlanInfo = {
  subscriptionId: string;
  planName: string;
  /** Opcional: versiones anteriores del API solo enviaban planes sin créditos. */
  reason?: 'credits' | 'expired';
  analysisLimit: number;
  remaining?: number;
  endsAt: string | null;
  dataDeletionAt?: string | null;
};

export const EXPIRED_PLAN_DATA_RETENTION_DAYS = 60;

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
  phone: string;
  phoneTicket: string;
  emailTicket?: string;
  /** Tipo de documento (CC, CE, TI, PA). */
  docType: string;
  /** Número de cédula / documento — obligatorio. */
  docNumber: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  lat?: number;
  lng?: number;
  skinType?: string;
  fitzpatrickType?: string;
  mascotType?: string;
};

export type MeUserDetails = {
  id: string;
  email: string;
  phone: string | null;
  phoneVerifiedAt: string | null;
  patient?: { id: string } | null;
  doctor?: { id: string; phone: string | null } | null;
};

/** @deprecated Preferir RegisterPatientPayload */
export type RegisterPayload = RegisterPatientPayload & {
  role?: 'patient' | 'doctor';
};
