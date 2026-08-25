import type { Role } from '@piel360/shared';

/** Payload firmado en el access token. Debe coincidir con lo que lee
 * apps/web/src/proxy.ts al verificar la sesión. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  permissions: string[];
  surveyCompletedAt?: string | null;
  /** Flags de Doctor (no roles): activan módulos de equipo / referidos. */
  empresa?: boolean;
  empresaReferida?: boolean;
  /** pending | in_review | verified | approved | active */
  verificationStatus?: string;
}
