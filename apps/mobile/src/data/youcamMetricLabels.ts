/** Labels de métricas YouCam (espejo de apps/web/src/lib/youcam-metric-labels.ts). */

export const YOUCAM_METRIC_LABELS: Record<string, string> = {
  hd_redness: 'Eritema',
  hd_oiliness: 'Grasa',
  hd_age_spot: 'Manchas de edad',
  hd_radiance: 'Brillo',
  hd_moisture: 'Hidratación',
  hd_dark_circle: 'Ojeras',
  hd_eye_bag: 'Bolsas oculares',
  hd_droopy_upper_eyelid: 'Párpado superior caído',
  hd_droopy_lower_eyelid: 'Párpado inferior caído',
  hd_firmness: 'Firmeza',
  hd_texture: 'Textura',
  hd_acne: 'Acné',
  hd_pore: 'Poros',
  hd_wrinkle: 'Arrugas',
  hd_tear_trough: 'Surco lagrimal',
  hd_skin_type: 'Tipo de piel',
  all: 'Puntuación global',
  skin_age: 'Edad de la piel',
  resize_image: 'Imagen redimensionada',
};

export const YOUCAM_REGION_LABELS: Record<string, string> = {
  whole: 'Cara completa',
  forehead: 'Frente',
  nose: 'Nariz',
  cheek: 'Mejillas',
  glabellar: 'Entrecejo',
  crowfeet: 'Patas de gallo',
  periocular: 'Contorno de ojos',
  nasolabial: 'Nasolabial',
  marionette: 'Marioneta',
  t_zone: 'Zona T',
  u_zone: 'Zona U',
};

export function youcamRegionLabel(region: string): string {
  return YOUCAM_REGION_LABELS[region] ?? region;
}

export function youcamMetricLabel(type: string, region?: string): string {
  const base = YOUCAM_METRIC_LABELS[type] ?? type;
  if (!region) return base;
  return `${base} — ${youcamRegionLabel(region)}`;
}

/** Los 8 valores posibles de skin_type según la doc de YouCam. */
export const YOUCAM_SKIN_TYPE_LABELS: Record<string, string> = {
  normal: 'Normal',
  oily: 'Grasa',
  dry: 'Seca',
  combination: 'Mixta',
  redness: 'Enrojecida',
  'dry & redness': 'Seca y enrojecida',
  'oily & redness': 'Grasa y enrojecida',
  'combination & redness': 'Mixta y enrojecida',
};

export function youcamSkinTypeLabel(value: string): string {
  return YOUCAM_SKIN_TYPE_LABELS[value.toLowerCase()] ?? value;
}
