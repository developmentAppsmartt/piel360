/** Prefijo país + número nacional → dígitos E.164 (sin +). */
export function combinePhoneDigits(
  prefix: string | null | undefined,
  national: string | null | undefined,
): string {
  const p = (prefix ?? '').replace(/\D/g, '');
  const n = (national ?? '').replace(/\D/g, '');
  return `${p}${n}`;
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}
