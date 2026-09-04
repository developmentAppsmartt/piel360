/**
 * Slugs semilla de `analysis_providers` (MIGRACION.md §3.1/§3.2).
 * Cada `Plan` pertenece a exactamente uno; los créditos no son intercambiables entre ellos.
 */
export const ANALYSIS_PROVIDER_SLUGS = ["skiniver", "youcam", "fitzpatrick"] as const;
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

/**
 * Métricas condicionables en Rutinas/Tratamientos (AnalysisConditionsService)
 * — las 16 de `YOUCAM_DST_ACTIONS` más tres salidas *derivadas*: `all`
 * (puntaje global, "Salud de la piel"), `skin_age` ("Salud de la piel
 * (años)", diferencia con la edad real) y `patient_age` (edad cronológica
 * real del paciente, vía `Patient.birthDate` — no viene de YouCam).
 */
export const CONDITIONABLE_METRIC_TYPES = [
  ...YOUCAM_DST_ACTIONS,
  "all",
  "skin_age",
  "patient_age",
] as const;

/**
 * Los 8 valores posibles de `hd_skin_type[].skin_type` según la doc de
 * YouCam (en minúsculas — la API no garantiza la misma capitalización byte a
 * byte, ver `youcamSkinTypeLabel`). Única fuente de verdad: valida el DTO de
 * condiciones en el backend y alimenta el selector de valor en el frontend
 * (que solo tenía las etiquetas, en apps/web/src/lib/youcam-metric-labels.ts).
 */
export const YOUCAM_SKIN_TYPE_VALUES = [
  "normal",
  "oily",
  "dry",
  "combination",
  "redness",
  "dry & redness",
  "oily & redness",
  "combination & redness",
] as const;

/**
 * Requisito de resolución de YouCam para HD Skincare (docs/AI-Skin-Analysis.MD
 * "File Specs & Errors"): el lado corto debe ser de al menos 1080px, o YouCam
 * rechaza la tarea con `error_below_min_image_size`. Compartido entre backend
 * (validación/upscale antes de subir) y frontend (chequeo en la captura de
 * YouCam) para que ambos usen el mismo umbral.
 */
export const YOUCAM_HD_MIN_SHORT_SIDE_PX = 1080;

/**
 * Piso por debajo del cual NO se intenta escalar la imagen hacia arriba —
 * capturas más chicas que esto son una foto genuinamente de baja calidad
 * (recorte/zoom/cámara pobre), no solo un recorte marginal por redondeo de
 * aspecto. Entre este piso y `YOUCAM_HD_MIN_SHORT_SIDE_PX`, el backend
 * redimensiona la imagen en vez de rechazarla (casos vistos en producción:
 * capturas de 1058px, ~2% por debajo del mínimo).
 */
export const YOUCAM_UPSCALE_MIN_SHORT_SIDE_PX = 1000;

/** Margen sobre el mínimo real al redimensionar, para no quedar en el límite
 * exacto por errores de redondeo al escalar ambos lados. */
export const YOUCAM_UPSCALE_TARGET_SHORT_SIDE_PX = 1088;
