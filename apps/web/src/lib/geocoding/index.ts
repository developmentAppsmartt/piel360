/**
 * Búsqueda de direcciones y dirección del pin para todos los selectores de
 * ubicación. Google si su script está cargado; si no, o si falla (clave
 * rechazada, servicio sin habilitar), OpenStreetMap, como hace el mapa.
 */
import { googlePlacesReady, reverseGoogle, searchGoogle } from "./google";
import { reverseNominatim, searchNominatim } from "./nominatim";

export type { AddressOption, ResolvedAddress } from "./types";

export async function searchAddresses(q: string, signal?: AbortSignal) {
  if (googlePlacesReady()) {
    try {
      return await searchGoogle(q);
    } catch (error) {
      console.warn("Búsqueda de Google falló; se usa OpenStreetMap", error);
    }
  }
  return searchNominatim(q, signal);
}

export async function reverseGeocode(lat: number, lng: number) {
  if (googlePlacesReady()) {
    try {
      return await reverseGoogle(lat, lng);
    } catch (error) {
      console.warn("Geocodificación de Google falló; se usa OpenStreetMap", error);
    }
  }
  try {
    return await reverseNominatim(lat, lng);
  } catch {
    return null; // el pin basta
  }
}
