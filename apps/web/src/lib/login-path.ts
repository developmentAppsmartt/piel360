/** Motivo con el que se llega al login cuando el backend cerró la sesión. */
export const SESSION_REPLACED_REASON = "session_replaced";

/**
 * Login que corresponde al panel en el que está parado el usuario — se usa
 * al expulsarlo por sesión cerrada desde otro dispositivo, para devolverlo
 * a la pantalla de acceso de su propio panel y no a una ajena.
 */
export function loginPathForCurrentPanel(pathname: string): string {
  if (pathname.startsWith("/doctor")) return "/doctor/login";
  if (pathname.startsWith("/moderador")) return "/moderador/login";
  if (pathname.startsWith("/admin")) return "/admin/login";
  // Los pacientes ya no tienen acceso web (entran por la app), así que el
  // único login que queda como destino es el profesional.
  return "/doctor/login";
}
