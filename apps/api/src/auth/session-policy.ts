import type { Role } from '@piel360/shared';

/** Cupo que ocupa una sesión: los profesionales tienen uno por plataforma
 * (1 web + 1 móvil), el resto de roles comparten un único cupo. */
export type SessionSlot = 'any' | 'web' | 'mobile';

/**
 * Sesiones simultáneas permitidas por rol (una por cupo):
 * - superadmin / monitor / empresa / patient → 1 sesión en cualquier dispositivo.
 * - doctor (independientes, técnicos y miembros de empresa) → 1 web + 1 móvil.
 *
 * Al iniciar sesión se revoca la que estuviera ocupando el mismo cupo: gana
 * el login más nuevo.
 */
export function sessionSlotFor(
  role: Role,
  client: 'mobile' | 'web',
): SessionSlot {
  return role === 'doctor' ? client : 'any';
}
