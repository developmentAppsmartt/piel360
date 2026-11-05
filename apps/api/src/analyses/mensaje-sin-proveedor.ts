/** La falla que ve el usuario no puede decir «proveedor». Si el texto lo
 * traía, se pide reintentar en unos minutos. */
export function mensajeSinProveedor(texto: string): string {
  if (!/proveedor|\bprovider\b/i.test(texto)) return texto;
  const sin = texto
    .replace(
      /[:,.]?\s*(por favor[:,.]?\s*)?(contacte|contacta|please contact)(\s+\w+){0,6}\s+(proveedores|proveedor|provider)\b[.!]*/gi,
      '',
    )
    .replace(/\bproveedores\b|\bproveedor\b|\bprovider\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim();
  const base = sin.replace(/^[\s,.;:]+|[\s,.;:]+$/g, '');
  const nucleo = base.length > 0 ? base : 'No se pudo completar el análisis';
  if (/unos minutos/i.test(nucleo)) {
    return nucleo.endsWith('.') ? nucleo : `${nucleo}.`;
  }
  return `${nucleo}. Intenta de nuevo en unos minutos.`;
}
