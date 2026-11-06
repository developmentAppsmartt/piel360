/** Iniciales del avatar cuando no hay foto (cabecera y Configuración). */
export function initialsFromEmail(email: string) {
  return email.slice(0, 2).toUpperCase();
}
