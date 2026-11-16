/** Texto que escribe una persona y acaba dentro del HTML de un correo: sin
 * escapar, un `<` parte la maqueta (o mete marcado ajeno). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
