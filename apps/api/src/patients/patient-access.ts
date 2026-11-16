import { ForbiddenException } from '@nestjs/common';
import { DOCTOR_PANEL_ROLES, type Role } from '@piel360/shared';
import type { JwtPayload } from '../auth/types';
import type { PrismaService } from '../prisma/prisma.service';

/** Quién es quién en los servicios de pacientes (lectura, escritura y
 * solicitudes de análisis). */

export function isDoctorPanelRole(role: Role): boolean {
  return DOCTOR_PANEL_ROLES.includes(role);
}

/** Admin de plataforma: listado global de pacientes (panel /admin/pacientes). */
export function isPlatformAdmin(user: JwtPayload): boolean {
  if (user.role === 'superadmin' || user.role === 'monitor') return true;
  if (
    user.roleSlugs?.includes('superadmin') ||
    user.roleSlugs?.includes('monitor')
  ) {
    return true;
  }
  if (user.primaryPanel === 'admin') return true;
  return user.permissions?.includes('admin.patients') === true;
}

/** El perfil de paciente del usuario autenticado. */
export async function requireOwnPatient(prisma: PrismaService, userId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId: BigInt(userId) },
  });
  if (!patient) {
    throw new ForbiddenException('El usuario no tiene un perfil de paciente');
  }
  return patient;
}
