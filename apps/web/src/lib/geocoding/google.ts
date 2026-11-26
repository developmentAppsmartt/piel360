/** Búsqueda (Places API New) y dirección del pin (Geocoding) con el script
 * de Google que ya cargó el mapa (`components/maps/google-maps-loader.ts`). */
import type { AddressOption, ResolvedAddress } from "./types";

type Component = { long: string; short: string; types: string[] };

/** El mapa carga el script con `libraries: ["places"]`; hasta entonces (o
 * sin clave) la búsqueda usa el respaldo. */
export function googlePlacesReady(): boolean {
  return typeof window !== "undefined" && !!window.google?.maps?.places?.AutocompleteSuggestion;
}

function pick(components: Component[], ...types: string[]): Component | undefined {
  for (const type of types) {
    const found = components.find((c) => c.types.includes(type));
    if (found) return found;
  }
  return undefined;
}

function toResolved(address: string, lat: number, lng: number, components: Component[]): ResolvedAddress {
  return {
    address,
    lat,
    lng,
    city: pick(components, "locality", "administrative_area_level_2")?.long ?? "",
    department: pick(components, "administrative_area_level_1")?.long ?? "",
    country: pick(components, "country")?.short.toUpperCase() ?? "",
    zip: pick(components, "postal_code")?.long ?? "",
  };
}

// Un token por búsqueda: Google cobra la sesión (sugerencias + detalle) como
// una sola consulta. Se renueva al elegir una sugerencia.
let sessionToken: google.maps.places.AutocompleteSessionToken | null = null;

export async function searchGoogle(q: string): Promise<AddressOption[]> {
  const { AutocompleteSuggestion, AutocompleteSessionToken } = google.maps.places;
  sessionToken ??= new AutocompleteSessionToken();
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: q,
    language: "es",
    region: "co",
    sessionToken,
  });
  return suggestions.flatMap(({ placePrediction }) => {
    if (!placePrediction) return [];
    return [
      {
        id: placePrediction.placeId,
        label: placePrediction.text.text,
        resolve: async () => {
          sessionToken = null;
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ["formattedAddress", "location", "addressComponents"] });
          if (!place.location) return null;
          return toResolved(
            place.formattedAddress ?? placePrediction.text.text,
            place.location.lat(),
            place.location.lng(),
            (place.addressComponents ?? []).map((c) => ({
              long: c.longText ?? "",
              short: c.shortText ?? "",
              types: c.types,
            })),
          );
        },
      },
    ];
  });
}

export async function reverseGoogle(lat: number, lng: number): Promise<ResolvedAddress | null> {
  const { results } = await new google.maps.Geocoder().geocode({ location: { lat, lng } });
  const best = results[0];
  if (!best) return null;
  return toResolved(
    best.formatted_address,
    lat,
    lng,
    best.address_components.map((c) => ({ long: c.long_name, short: c.short_name, types: c.types })),
  );
}
