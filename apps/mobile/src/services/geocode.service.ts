/**
 * Geocoding vía Google Maps Platform (Places + Geocoding).
 * Requiere EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
 */
import { googleMapsService } from './googleMaps.service';

export type LatLng = { lat: number; lng: number };

export type PlaceSuggestion = {
  id: string;
  description: string;
  /** Si viene, no hace falta resolver el placeId. */
  lat?: number;
  lng?: number;
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

export const geocodeService = {
  async autocomplete(
    input: string,
    signal?: AbortSignal,
  ): Promise<PlaceSuggestion[]> {
    const preds = await googleMapsService.autocomplete(input, signal);
    return preds.map((p) => ({
      id: p.placeId,
      description: p.description,
    }));
  },

  async resolveSuggestion(item: PlaceSuggestion): Promise<ResolvedPlace> {
    if (
      typeof item.lat === 'number' &&
      typeof item.lng === 'number' &&
      Number.isFinite(item.lat) &&
      Number.isFinite(item.lng)
    ) {
      return {
        address: item.description,
        lat: item.lat,
        lng: item.lng,
        city: item.city,
        country: item.country ?? 'CO',
        zip: item.zip,
      };
    }
    return googleMapsService.resolvePlaceId(item.id);
  },

  async reverseGeocode(lat: number, lng: number): Promise<ResolvedPlace> {
    return googleMapsService.reverseGeocode(lat, lng);
  },
};
