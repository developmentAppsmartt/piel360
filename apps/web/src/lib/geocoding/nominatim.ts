/** Respaldo de OpenStreetMap: se usa sin clave de Google o si Google falla. */
import { countryCodeFromNominatim } from "@/lib/nominatim-address";
import type { AddressOption, ResolvedAddress } from "./types";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
};

const DEPARTMENTS =
  /^(valle del cauca|antioquia|cundinamarca|atl[aá]ntico|bol[ií]var|boyac[aá]|caldas|caquet[aá]|casanare|cauca|cesar|choc[oó]|c[oó]rdoba|guain[ií]a|guaviare|huila|la guajira|magdalena|meta|nari[nñ]o|norte de santander|putumayo|quind[ií]o|risaralda|san andr[eé]s|santander|sucre|tolima|arauca|amazonas|vichada)$/i;

function isBadCityLabel(value: string): boolean {
  return /per[ií]metro/i.test(value) || /^comuna\b/i.test(value) || /^barrio\b/i.test(value);
}

function cityOf(a: NominatimResult["address"], displayName: string): string {
  for (const c of [a?.city, a?.town, a?.village]) {
    const t = c?.trim();
    if (t && !isBadCityLabel(t)) return t;
  }
  const muni = a?.municipality?.trim();
  if (muni) {
    const peri = muni.match(/per[ií]metro\s+urbano\s+(.+)/i);
    if (peri?.[1]?.trim()) return peri[1].trim();
    if (!isBadCityLabel(muni)) return muni;
  }
  const parts = displayName.split(",").map((p) => p.trim());
  const periIdx = parts.findIndex((p) => /per[ií]metro\s+urbano/i.test(p));
  if (periIdx >= 0) {
    const fromLabel = parts[periIdx].match(/per[ií]metro\s+urbano\s+(.+)/i);
    if (fromLabel?.[1]?.trim()) return fromLabel[1].trim();
    const next = parts[periIdx + 1];
    if (next && !isBadCityLabel(next) && !/^\d+$/.test(next)) return next;
  }
  return a?.state?.trim() ?? "";
}

function zipOf(a: NominatimResult["address"], displayName: string): string {
  return a?.postcode?.trim() || displayName.match(/\b(\d{4,6})\b/)?.[1] || "";
}

/** Departamento / estado (Colombia: Valle del Cauca, Antioquia, …). */
function departmentOf(a: NominatimResult["address"], displayName: string): string {
  const state = a?.state?.trim();
  if (state && !/^colombia$/i.test(state) && !/^rap\b/i.test(state)) return state;
  const parts = displayName
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^colombia$/i.test(p) && !/^\d{4,6}$/.test(p) && !/^rap\b/i.test(p));
  for (let i = parts.length - 1; i >= 0; i--) {
    if (DEPARTMENTS.test(parts[i])) return parts[i];
  }
  return parts.length >= 2 ? parts[parts.length - 1] : "";
}

function toResolved(item: NominatimResult, lat: number, lng: number): ResolvedAddress {
  return {
    address: item.display_name,
    lat,
    lng,
    city: cityOf(item.address, item.display_name),
    department: departmentOf(item.address, item.display_name),
    country: countryCodeFromNominatim(item.address, item.display_name),
    zip: zipOf(item.address, item.display_name),
  };
}

export async function searchNominatim(q: string, signal?: AbortSignal): Promise<AddressOption[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  // Sin countrycodes: el profesional puede estar en CO, EC, etc.
  const res = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("geocode");
  const data = (await res.json()) as NominatimResult[];
  return data.map((item) => {
    const resolved = toResolved(item, Number(item.lat), Number(item.lon));
    return {
      id: `${item.lat}-${item.lon}-${item.display_name}`,
      label: item.display_name,
      resolve: async () => resolved,
    };
  });
}

export async function reverseNominatim(lat: number, lng: number): Promise<ResolvedAddress | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<NominatimResult>;
  return data.display_name ? toResolved(data as NominatimResult, lat, lng) : null;
}
