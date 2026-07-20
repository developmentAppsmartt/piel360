/**
 * Port literal de `Piel360/public/js/human-body-selector.js` (BODY_PARTS_INFO +
 * inferBodyPartFromPoint) — la tabla de 30 regiones y el fallback geométrico
 * para cuando el nombre de una malla del GLB no coincide con ninguna región
 * conocida. Los umbrales de `inferBodyPartFromPoint` asumen el mismo
 * normalizado del modelo (escala a 1.8 de alto, centrado, +1.05 en Y).
 */
export interface BodyPartInfo {
  label: string;
  description: string;
}

export const BODY_PARTS_INFO: Record<string, BodyPartInfo> = {
  face: { label: "Rostro", description: "Región facial anterior" },
  nose: { label: "Nariz", description: "Región nasal y puente" },
  left_ear: { label: "Oreja Izquierda", description: "Pabellón auricular izquierdo" },
  right_ear: { label: "Oreja Derecha", description: "Pabellón auricular derecho" },
  scalp: { label: "Cuero Cabelludo", description: "Región craneal posterior/superior" },
  neck: { label: "Cuello", description: "Región cervical" },
  chest: { label: "Tórax / Pecho", description: "Región pectoral y clavicular" },
  abdomen: { label: "Abdomen", description: "Región abdominal y umbilical" },
  pelvis: { label: "Pelvis", description: "Región pélvica e inguinal" },
  upper_back: { label: "Espalda Alta", description: "Región dorsal y escapular" },
  lower_back: { label: "Espalda Baja", description: "Región lumbar" },
  gluteus: { label: "Glúteos", description: "Región sacra y glútea" },
  left_shoulder: { label: "Hombro Izquierdo", description: "Región deltoidea izquierda" },
  left_upper_arm: { label: "Brazo Izquierdo", description: "Región braquial izquierda" },
  left_elbow: { label: "Codo Izquierdo", description: "Región olecraniana izquierda" },
  left_forearm: { label: "Antebrazo Izquierdo", description: "Región antebraquial izquierda" },
  left_hand: { label: "Mano Izquierda", description: "Región manual izquierda" },
  right_shoulder: { label: "Hombro Derecho", description: "Región deltoidea derecha" },
  right_upper_arm: { label: "Brazo Derecho", description: "Región braquial derecha" },
  right_elbow: { label: "Codo Derecho", description: "Región olecraniana derecha" },
  right_forearm: { label: "Antebrazo Derecho", description: "Región antebraquial derecha" },
  right_hand: { label: "Mano Derecha", description: "Región manual derecha" },
  left_thigh: { label: "Muslo Izquierdo", description: "Región femoral izquierda" },
  left_knee: { label: "Rodilla Izquierda", description: "Región patelar izquierda" },
  left_shin: { label: "Pierna Izquierda", description: "Región crural/tibial izquierda" },
  left_foot: { label: "Pie Izquierdo", description: "Región podal izquierda (Dorso)" },
  left_sole: { label: "Planta Pie Izquierdo", description: "Región plantar izquierda" },
  right_thigh: { label: "Muslo Derecho", description: "Región femoral derecha" },
  right_knee: { label: "Rodilla Derecha", description: "Región patelar derecha" },
  right_shin: { label: "Pierna Derecha", description: "Región crural/tibial derecha" },
  right_foot: { label: "Pie Derecho", description: "Región podal derecha (Dorso)" },
  right_sole: { label: "Planta Pie Derecho", description: "Región plantar derecha" },
};

export function normalizeMeshName(name: string): string {
  return name.toLowerCase().replace(/[\s_]+/g, "_");
}

/** Fallback geométrico por bounding-box cuando el nombre de la malla no está
 * en BODY_PARTS_INFO (modelos con nomenclatura de malla inconsistente). */
export function inferBodyPartFromPoint(point: { x: number; y: number; z: number }): string {
  const { x, y, z } = point;
  const absX = Math.abs(x);

  // Cabeza y cuello (Y > 1.70)
  if (y > 1.7) {
    if (y > 1.77) {
      if (z > 0.05) return absX < 0.04 && y < 1.83 && z > 0.12 ? "nose" : "face";
      if (absX > 0.06 && y > 1.8 && y < 1.87) return x > 0 ? "right_ear" : "left_ear";
      return "scalp";
    }
    return "neck";
  }

  // Brazos
  if (absX > 0.2 && y > 0.85) {
    const side = x < 0 ? "left" : "right";
    if (y > 1.5) return `${side}_shoulder`;
    if (y > 1.2) return `${side}_upper_arm`;
    if (y > 1.0) return `${side}_elbow`;
    if (y > 0.7) return `${side}_forearm`;
    return `${side}_hand`;
  }

  // Torso
  if (y > 0.9) {
    const isFront = z > 0;
    if (y > 1.4) return isFront ? "chest" : "upper_back";
    if (y > 1.1) return isFront ? "abdomen" : "lower_back";
    return isFront ? "pelvis" : "gluteus";
  }

  // Piernas
  const side = x < 0 ? "left" : "right";
  if (y > 0.6) return `${side}_thigh`;
  if (y > 0.5) return `${side}_knee`;
  if (y > 0.25) return `${side}_shin`;
  if (y < 0.18) return `${side}_sole`;
  return `${side}_foot`;
}
