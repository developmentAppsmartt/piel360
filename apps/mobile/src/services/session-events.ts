/**
 * Puente entre `apiRequest` (que detecta el 401 irrecuperable) y
 * `AuthContext` (el único que puede limpiar la sesión y llevar al login).
 * Sin esto, al expirar o cerrarse la sesión desde otro dispositivo la app
 * se quedaba "logueada" con todas las peticiones fallando en silencio.
 */
export type SessionEndedReason = 'replaced' | 'expired';

/** Espejo de `SESSION_REPLACED` / `SESSION_REPLACED_MESSAGE` en
 * @piel360/shared (mobile no importa el paquete). */
export const SESSION_REPLACED = 'SESSION_REPLACED';
export const SESSION_REPLACED_MESSAGE =
  'Tu sesión se cerró porque se inició en otro dispositivo.';

type Listener = (reason: SessionEndedReason) => void;

let listener: Listener | null = null;

export function onSessionEnded(handler: Listener | null) {
  listener = handler;
}

export function emitSessionEnded(reason: SessionEndedReason) {
  listener?.(reason);
}
