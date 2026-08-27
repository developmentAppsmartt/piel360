/**
 * Geocoding alineado al CRM web (Nominatim / OSM).
 */

export type LatLng = { lat: number; lng: number };

export type PlaceSuggestion = {
  id: string;
  description: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  zip?: string;
};

export type ResolvedPlace = {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  zip?: string;
};

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  city_district?: string;
  county?: string;
  state?: string;
  suburb?: string;
  hamlet?: string;
  country_code?: string;
  postcode?: string;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

function isBadCityLabel(value: string): boolean {
  return (
    /per[ií]metro/i.test(value) ||
    /^comuna\b/i.test(value) ||
    /^barrio\b/i.test(value) ||
    /^localidad\b/i.test(value)
  );
}

/** Extrae ciudad real (evita "Perímetro Urbano …"). */
function cityFrom(
  a: NominatimAddress | undefined,
  displayName: string,
): string | undefined {
  const prefer = [a?.city, a?.town, a?.village, a?.hamlet];
  for (const c of prefer) {
    const t = c?.trim();
    if (t && !isBadCityLabel(t)) return t;
  }

  const muni = a?.municipality?.trim();
  if (muni) {
    const peri = muni.match(/per[ií]metro\s+urbano\s+(.+)/i);
    if (peri?.[1]?.trim()) return peri[1].trim();
    if (!isBadCityLabel(muni)) return muni;
  }

  // "... Perímetro Urbano Cúcuta, Cúcuta, Oriental, ..."
  const parts = displayName.split(',').map((p) => p.trim()).filter(Boolean);
  const periIdx = parts.findIndex((p) => /per[ií]metro\s+urbano/i.test(p));
  if (periIdx >= 0) {
    const fromLabel = parts[periIdx].match(/per[ií]metro\s+urbano\s+(.+)/i);
    if (fromLabel?.[1]?.trim()) return fromLabel[1].trim();
    const next = parts[periIdx + 1];
    if (next && !isBadCityLabel(next) && !/^\d+$/.test(next)) return next;
  }

  // Si display tiene "Cúcuta" explícito tras comuna/peri
  const cityLike = parts.find(
    (p, i) =>
      i > 0 &&
      !isBadCityLabel(p) &&
      !/norte de santander|cundinamarca|antioquia|valle|colombia|oriental|occidental|rap\b/i.test(
        p,
      ) &&
      !/^\d+$/.test(p) &&
      !/^(calle|carrera|avenida|diagonal|transversal)\b/i.test(p) &&
      p.length >= 3 &&
      p.length <= 32,
  );
  if (cityLike) return cityLike;

  const county = a?.county?.trim();
  if (county && !isBadCityLabel(county)) return county;

  return undefined;
}

function zipFrom(
  a: NominatimAddress | undefined,
  displayName: string,
): string | undefined {
  const fromAddr = a?.postcode?.trim();
  if (fromAddr) return fromAddr;
  // Colombia: códigos de 4–6 dígitos en el display_name
  const m = displayName.match(/\b(\d{4,6})\b/);
  return m?.[1];
}

function fromNominatim(item: NominatimResult): ResolvedPlace {
  return {
    address: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
    city: cityFrom(item.address, item.display_name),
    country: item.address?.country_code
      ? item.address.country_code.toUpperCase()
      : 'CO',
    zip: zipFrom(item.address, item.display_name),
  };
}

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Piel360/1.0 (mobile; ubicacion)',
};

export const geocodeService = {
  async autocomplete(
    input: string,
    signal?: AbortSignal,
  ): Promise<PlaceSuggestion[]> {
    const q = input.trim();
    if (q.length < 3) return [];

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '8');
    url.searchParams.set('countrycodes', 'co');

    const res = await fetch(url.toString(), {
      signal,
      headers: NOMINATIM_HEADERS,
    });
    if (!res.ok) throw new Error('No se pudo buscar la dirección');
    const data = (await res.json()) as NominatimResult[];
    return data.map((item) => {
      const resolved = fromNominatim(item);
      return {
        id: `${item.lat}-${item.lon}-${item.display_name}`,
        description: item.display_name,
        lat: resolved.lat,
        lng: resolved.lng,
        city: resolved.city,
        country: resolved.country,
        zip: resolved.zip,
      };
    });
  },

  async reverseGeocode(lat: number, lng: number): Promise<ResolvedPlace> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), { headers: NOMINATIM_HEADERS });
    if (!res.ok) {
      return {
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng,
        country: 'CO',
      };
    }
    const data = (await res.json()) as NominatimResult;
    if (!data.display_name) {
      return {
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng,
        country: 'CO',
      };
    }
    return fromNominatim(data);
  },
};
