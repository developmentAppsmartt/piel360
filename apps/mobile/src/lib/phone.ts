export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function combinePhoneDigits(
  prefix: string,
  national: string,
): string {
  return `${digitsOnly(prefix)}${digitsOnly(national)}`;
}

export function isValidE164Digits(phone: string): boolean {
  return /^\d{10,15}$/.test(phone);
}

export function splitPhoneDigits(full: string): { prefix: string; national: string } {
  const digits = digitsOnly(full);
  if (!digits) return { prefix: '57', national: '' };
  if (digits.startsWith('57') && digits.length >= 12) {
    return { prefix: '57', national: digits.slice(2) };
  }
  if (digits.length === 10 && digits.startsWith('3')) {
    return { prefix: '57', national: digits };
  }
  if (digits.length >= 11) {
    return { prefix: digits.slice(0, 2), national: digits.slice(2) };
  }
  return { prefix: '57', national: digits };
}

export function normalizeAreaCode(value: string): string {
  return digitsOnly(value).slice(0, 4) || '57';
}

export function normalizeNationalPhone(value: string): string {
  return digitsOnly(value).slice(0, 12);
}
