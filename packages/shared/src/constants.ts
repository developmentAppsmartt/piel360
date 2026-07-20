/**
 * Slugs semilla de `analysis_providers` (MIGRACION.md §3.1/§3.2).
 * Cada `Plan` pertenece a exactamente uno; los créditos no son intercambiables entre ellos.
 */
export const ANALYSIS_PROVIDER_SLUGS = ["skiniver", "youcam"] as const;
export type AnalysisProviderSlug = (typeof ANALYSIS_PROVIDER_SLUGS)[number];

/**
 * Las 16 métricas HD solicitadas a YouCam en `dst_actions`
 * (INTEGRACIONES-IA.md §2.3 — YouCamService.startAnalysis).
 */
export const YOUCAM_DST_ACTIONS = [
  "hd_redness",
  "hd_oiliness",
  "hd_age_spot",
  "hd_radiance",
  "hd_moisture",
  "hd_dark_circle",
  "hd_eye_bag",
  "hd_droopy_upper_eyelid",
  "hd_droopy_lower_eyelid",
  "hd_firmness",
  "hd_texture",
  "hd_acne",
  "hd_pore",
  "hd_wrinkle",
  "hd_tear_trough",
  "hd_skin_type",
] as const;

export type YouCamAction = (typeof YOUCAM_DST_ACTIONS)[number];
