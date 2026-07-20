import type { YouCamAction } from "@piel360/shared";

export const YOUCAM_METRIC_LABELS: Record<YouCamAction, string> = {
  hd_redness: "Enrojecimiento",
  hd_oiliness: "Grasa",
  hd_age_spot: "Manchas de edad",
  hd_radiance: "Luminosidad",
  hd_moisture: "Hidratación",
  hd_dark_circle: "Ojeras",
  hd_eye_bag: "Bolsas oculares",
  hd_droopy_upper_eyelid: "Párpado superior caído",
  hd_droopy_lower_eyelid: "Párpado inferior caído",
  hd_firmness: "Firmeza",
  hd_texture: "Textura",
  hd_acne: "Acné",
  hd_pore: "Poros",
  hd_wrinkle: "Arrugas",
  hd_tear_trough: "Surco lagrimal",
  hd_skin_type: "Tipo de piel",
};

// Algunas métricas (hd_pore, hd_wrinkle, hd_skin_type) traen varias regiones
// bajo el mismo `type` — se usa para distinguirlas en el carrusel.
const YOUCAM_REGION_LABELS: Record<string, string> = {
  whole: "General",
  forehead: "Frente",
  nose: "Nariz",
  cheek: "Mejillas",
  glabellar: "Entrecejo",
  crowfeet: "Patas de gallo",
  periocular: "Contorno de ojos",
  nasolabial: "Nasolabial",
  marionette: "Marioneta",
  t_zone: "Zona T",
  u_zone: "Zona U",
};

export function youcamMaskLabel(type: string, region?: string): string {
  const base = YOUCAM_METRIC_LABELS[type as keyof typeof YOUCAM_METRIC_LABELS] ?? type;
  if (!region) return base;
  return `${base} — ${YOUCAM_REGION_LABELS[region] ?? region}`;
}
