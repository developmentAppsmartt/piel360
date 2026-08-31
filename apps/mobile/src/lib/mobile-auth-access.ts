import { ApiError } from '../services/api.client';
import type { AuthResult, AuthUser, Role } from '../types/auth';

/** Espejo de `MOBILE_BLOCKED_ROLES` en @piel360/shared (mobile no importa el paquete). */
const MOBILE_BLOCKED_ROLES = ['superadmin', 'monitor'] as const;

const MOBILE_BLOCKED_MESSAGE =
  'Esta cuenta no puede iniciar sesión en la app móvil. Usa el panel web.';

export function isMobileLoginAllowed(role: Role | undefined): boolean {
  if (!role) return false;
  return !(MOBILE_BLOCKED_ROLES as readonly Role[]).includes(role);
}

export function assertMobileLoginAllowed(result: AuthResult): AuthResult {
  if (!isMobileLoginAllowed(result.user.role)) {
    throw new ApiError(MOBILE_BLOCKED_MESSAGE, 403, result);
  }
  return result;
}

export function isStoredMobileSessionUser(
  user: AuthUser | null | undefined,
): user is AuthUser {
  return !!user && isMobileLoginAllowed(user.role);
}
