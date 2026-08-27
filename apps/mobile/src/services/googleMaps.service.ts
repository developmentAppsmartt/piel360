import { getGoogleMapsApiKey } from '../config/env';

export type LatLng = { lat: number; lng: number };

export type PlaceSuggestion = {
  placeId: string;
  description: string;
};

export type ResolvedPlace = {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  zip?: string;
};

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function requireKey(): string {
  const key = getGoogleMapsApiKey();
  if (!key) {
    throw new Error(
      'Falta EXPO_PUBLIC_GOOGLE_MAPS_API_KEY en apps/mobile/.env',
    );
  }
  return key;
}

function component(
  components: AddressComponent[] | undefined,
  type: string,
  useShort = false,
): string | undefined {
  const hit = components?.find((c) => c.types.includes(type));
  if (!hit) return undefined;
  return (useShort ? hit.short_name : hit.long_name) || undefined;
}

function fromAddressComponents(
  components: AddressComponent[] | undefined,
): Pick<ResolvedPlace, 'city' | 'country' | 'zip'> {
  const city =
    component(components, 'locality') ??
    component(components, 'administrative_area_level_2') ??
    component(components, 'administrative_area_level_1');
  const country = component(components, 'country', true);
  const zip = component(components, 'postal_code');
  return {
    ...(city ? { city } : {}),
    ...(country ? { country } : {}),
    ...(zip ? { zip } : {}),
  };
}

export const googleMapsService = {
  async autocomplete(
    input: string,
    signal?: AbortSignal,
  ): Promise<PlaceSuggestion[]> {
    const q = input.trim();
    if (q.length < 3) return [];

    const key = requireKey();
    const url = new URL(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
    );
    url.searchParams.set('input', q);
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'es');
    url.searchParams.set('components', 'country:co');

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error('No se pudo buscar la dirección');
    const data = (await res.json()) as {
      status: string;
      predictions?: { place_id: string; description: string }[];
      error_message?: string;
    };
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message ?? `Places: ${data.status}`);
    }
    return (data.predictions ?? []).map((p) => ({
      placeId: p.place_id,
      description: p.description,
    }));
  },

  async resolvePlaceId(placeId: string): Promise<ResolvedPlace> {
    const key = requireKey();
    const url = new URL(
      'https://maps.googleapis.com/maps/api/place/details/json',
    );
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'es');
    url.searchParams.set(
      'fields',
      'formatted_address,geometry,address_component',
    );

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('No se pudo obtener el lugar');
    const data = (await res.json()) as {
      status: string;
      result?: {
        formatted_address?: string;
        geometry?: { location?: { lat: number; lng: number } };
        address_components?: AddressComponent[];
      };
      error_message?: string;
    };
    if (data.status !== 'OK' || !data.result?.geometry?.location) {
      throw new Error(data.error_message ?? `Place details: ${data.status}`);
    }
    const { lat, lng } = data.result.geometry.location;
    return {
      address: data.result.formatted_address ?? '',
      lat,
      lng,
      ...fromAddressComponents(data.result.address_components),
    };
  },

  async reverseGeocode(lat: number, lng: number): Promise<ResolvedPlace> {
    const key = requireKey();
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'es');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('No se pudo resolver la ubicación');
    const data = (await res.json()) as {
      status: string;
      results?: {
        formatted_address?: string;
        address_components?: AddressComponent[];
      }[];
      error_message?: string;
    };
    if (data.status !== 'OK' || !data.results?.[0]) {
      return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
    }
    const top = data.results[0];
    return {
      address: top.formatted_address ?? `${lat}, ${lng}`,
      lat,
      lng,
      ...fromAddressComponents(top.address_components),
    };
  },
};
