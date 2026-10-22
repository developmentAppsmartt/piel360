/** Fragmento `address` de Nominatim (search/reverse con addressdetails=1). */
export type NominatimAddressBits = {
  country_code?: string;
  country?: string;
};

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  colombia: "CO",
  ecuador: "EC",
  peru: "PE",
  perú: "PE",
  venezuela: "VE",
  panama: "PA",
  panamá: "PA",
  chile: "CL",
  argentina: "AR",
  mexico: "MX",
  méxico: "MX",
  brasil: "BR",
  brazil: "BR",
  bolivia: "BO",
  uruguay: "UY",
  paraguay: "PY",
  "costa rica": "CR",
  spain: "ES",
  españa: "ES",
  "united states": "US",
  "estados unidos": "US",
};

/**
 * ISO-3166 alpha-2 desde Nominatim. No asume Colombia: si no hay dato, usa
 * `fallback` o cadena vacía (nunca fuerza "CO").
 */
export function countryCodeFromNominatim(
  address?: NominatimAddressBits | null,
  displayName?: string,
  fallback?: string,
): string {
  const code = address?.country_code?.trim();
  if (code) return code.toUpperCase();

  const byName = address?.country?.trim().toLowerCase();
  if (byName && COUNTRY_NAME_TO_ISO[byName]) {
    return COUNTRY_NAME_TO_ISO[byName];
  }

  if (displayName) {
    const parts = displayName
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const last = parts.at(-1);
    if (last) {
      const fromName = COUNTRY_NAME_TO_ISO[last.toLowerCase()];
      if (fromName) return fromName;
      if (/^[A-Za-z]{2}$/.test(last)) return last.toUpperCase();
    }
  }

  return fallback?.trim().toUpperCase() || "";
}
