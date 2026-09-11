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

/** Parte un E.164 en dígitos en prefijo + nacional (Colombia por defecto). */
export function splitPhoneDigits(full: string): {
  areaCode: string;
  phone: string;
} {
  const digits = normalizePhoneDigits(full);
  if (!digits) return { areaCode: '+57', phone: '' };
  if (digits.startsWith('57') && digits.length >= 12) {
    return { areaCode: '+57', phone: digits.slice(2) };
  }
  if (digits.length === 10 && digits.startsWith('3')) {
    return { areaCode: '+57', phone: digits };
  }
  if (digits.length >= 11) {
    return {
      areaCode: `+${digits.slice(0, 2)}`,
      phone: digits.slice(2),
    };
  }
  return { areaCode: '+57', phone: digits };
}
