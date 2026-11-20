import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';

export type PhoneCountryOption = {
  iso: CountryCode;
  callingCode: string;
  name: string;
  flag: string;
};

const regionNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['es'], { type: 'region' })
    : null;

/** Bandera emoji a partir del ISO-2 (p. ej. CO → 🇨🇴). */
export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function countryName(iso: CountryCode): string {
  return regionNames?.of(iso) ?? iso;
}

let cached: PhoneCountryOption[] | null = null;

/** Lista de países con prefijo (orden alfabético en español). */
export function listPhoneCountries(): PhoneCountryOption[] {
  if (cached) return cached;
  cached = getCountries()
    .map((iso) => ({
      iso,
      callingCode: getCountryCallingCode(iso),
      name: countryName(iso),
      flag: flagEmoji(iso),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return cached;
}

/** Resuelve ISO a partir del prefijo (prioriza CO para +57). */
export function countryFromCallingCode(
  callingCode: string,
  preferredIso?: CountryCode | null,
): PhoneCountryOption {
  const digits = callingCode.replace(/\D/g, '') || '57';
  const all = listPhoneCountries().filter((c) => c.callingCode === digits);
  if (preferredIso) {
    const hit = all.find((c) => c.iso === preferredIso);
    if (hit) return hit;
  }
  if (digits === '57') {
    const co = all.find((c) => c.iso === 'CO');
    if (co) return co;
  }
  if (digits === '1') {
    const us = all.find((c) => c.iso === 'US');
    if (us) return us;
  }
  return (
    all[0] ?? {
      iso: 'CO',
      callingCode: '57',
      name: 'Colombia',
      flag: flagEmoji('CO'),
    }
  );
}

export function filterPhoneCountries(query: string): PhoneCountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return listPhoneCountries();
  return listPhoneCountries().filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.callingCode.includes(q) ||
      c.iso.toLowerCase().includes(q),
  );
}
