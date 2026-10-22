/**
 * El vocabulario que conoce el navegador. Vive aparte de
 * `provider-public-alias.ts` **a propósito**: ese módulo guarda las tablas con
 * los slugs internos, y basta con que el web importe una sola función de ahí
 * para que el bundler se traiga el módulo entero y los nombres del proveedor
 * acaben en un chunk. Comprobado con `scripts/sin-nombres-de-proveedor.mjs`.
 */

export const PUBLIC_ANALYSIS_PROVIDER_SLUGS = [
  "analisisdermapiel360",
  "analisispiel360",
  "fitzpatrick",
] as const;

export type PublicAnalysisProviderSlug =
  (typeof PUBLIC_ANALYSIS_PROVIDER_SLUGS)[number];

const PREFIJOS = ["use_provider_", "patient_run_"] as const;

/**
 * `use_provider_analisispiel360` → `analisispiel360`.
 *
 * Solo entiende el nombre público, que es el único que sale del API (ver
 * `toPublicProviderPermission`). No desenmascara: hacerlo obligaría a traer la
 * tabla interna al navegador.
 */
export function publicProviderSlugFromUsagePermission(
  permission: string,
): PublicAnalysisProviderSlug | null {
  for (const prefijo of PREFIJOS) {
    if (!permission.startsWith(prefijo)) continue;
    const slug = permission.slice(prefijo.length);
    if ((PUBLIC_ANALYSIS_PROVIDER_SLUGS as readonly string[]).includes(slug)) {
      return slug as PublicAnalysisProviderSlug;
    }
  }
  return null;
}
