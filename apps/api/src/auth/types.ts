import type { PrimaryPanel, Role, TeamMemberPermission } from '@piel360/shared';

/** Payload firmado en el access token. Debe coincidir con lo que lee
 * apps/web/src/proxy.ts al verificar la sesión. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  /** Panel principal del usuario (admin | clinical | patient). */
  primaryPanel: PrimaryPanel;
  /** Slugs de roles RBAC asignados en BD. */
  roleSlugs: string[];
  permissions: string[];
  surveyCompletedAt?: string | null;
  /** Flags de Doctor (no roles): activan módulos de equipo / referidos. */
  empresa?: boolean;
  empresaReferida?: boolean;
  /** pending | in_review | verified | approved | active */
  verificationStatus?: string;
  /** Permisos de módulo del equipo empresa (null = no es miembro de org). */
  teamPermissions?: TeamMemberPermission[] | null;
  organizationMemberRole?: 'owner' | 'member' | null;
  isOrgMember?: boolean;
}
