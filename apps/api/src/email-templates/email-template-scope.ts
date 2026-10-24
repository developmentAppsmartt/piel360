import type { JwtPayload } from '../auth/types';
import type { OrgContextService } from '../organizations/org-context.service';

/**
 * De quién son las plantillas y variables que ve este usuario.
 *
 * `null` = plataforma: las de moderación del registro no pertenecen a nadie
 * y un moderador ni siquiera tiene ficha de doctor, así que antes el módulo
 * entero le respondía «El usuario no tiene un perfil de doctor».
 */
export async function templateScopeDoctorId(
  orgContext: OrgContextService,
  user: JwtPayload,
): Promise<bigint | null> {
  if (user.role === 'superadmin' || user.role === 'monitor') return null;
  const ctx = await orgContext.assertTeamPermissionForUser(user.sub, 'billing');
  return ctx.catalogDoctorId;
}
