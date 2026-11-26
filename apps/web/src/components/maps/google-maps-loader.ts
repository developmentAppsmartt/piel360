import type { Libraries } from "@react-google-maps/api";

// Constante fuera del componente: si el arreglo cambia de identidad en cada
// render, `useJsApiLoader` avisa y puede recargar.
const LIBRARIES: Libraries = ["places"];

/** Opciones del script de Google, iguales en todos los mapas: con el mismo
 * `id` y opciones distintas `@react-google-maps/api` lanza un error. `places`
 * es para la búsqueda de direcciones (`lib/geocoding`). */
export function googleMapsLoaderOptions(apiKey: string) {
  return {
    id: "piel360-google-maps",
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: "es",
    region: "CO",
  };
}
