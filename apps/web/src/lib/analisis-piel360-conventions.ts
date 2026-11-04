/**
 * Convenciones de color por métrica del análisis estético (la leyenda junto a
 * la máscara). Espejo de `apps/mobile/src/data/youcamMetricConventions.ts`:
 * si cambia uno, cambia el otro. El móvil no puede importar del web ni de
 * `shared`, y aquí los nombres no pueden llevar el del proveedor.
 */

export type MetricConvention = {
  /** Color de la píldora del visor. */
  color: string;
  /** Extremo intenso (arriba en la barra). */
  highLabel: string;
  /** Extremo leve (abajo en la barra). */
  lowLabel: string;
  /** Degradado de arriba hacia abajo. */
  gradient: readonly string[];
};

const DEFAULT_COLOR = "#6366F1";

const CONVENTIONS: Record<string, MetricConvention> = {
  hd_oiliness: {
    color: "#F5A623",
    highLabel: "Muy graso",
    lowLabel: "Ligeramente",
    gradient: ["#F5A623", "#C4783A", "#5C4A28"],
  },
  hd_moisture: {
    color: "#14B8A6",
    highLabel: "Seca",
    lowLabel: "Hidratado",
    gradient: ["#E53935", "#EC407A", "#FFEB3B", "#66BB6A", "#29B6F6"],
  },
  hd_acne: {
    color: "#7EB8D8",
    highLabel: "Muy marcado",
    lowLabel: "Ligeramente",
    gradient: ["#7EB8D8", "#A9CFE4", "#D9EAF3"],
  },
  hd_wrinkle: {
    color: "#22C55E",
    highLabel: "Líneas profundas",
    lowLabel: "Líneas finas",
    gradient: ["#15803D", "#22C55E", "#BBF7D0"],
  },
  hd_pore: {
    color: "#0D9488",
    highLabel: "Grave",
    lowLabel: "Leve",
    gradient: ["#0F766E", "#14B8A6", "#99F6E4"],
  },
  hd_redness: {
    color: "#F97316",
    highLabel: "Muy rojo",
    lowLabel: "Ligeramente",
    gradient: ["#EA580C", "#FB923C", "#FED7AA"],
  },
  hd_age_spot: {
    color: "#1E3A5F",
    highLabel: "Puntos Negros",
    lowLabel: "Puntos Claros",
    gradient: ["#0B1F3A", "#3D7EA6", "#B8EAF5"],
  },
  hd_radiance: {
    color: "#111827",
    highLabel: "Sin Brillo",
    lowLabel: "Radiante",
    gradient: ["#111827", "#6B7280", "#F9FAFB"],
  },
  hd_dark_circle: {
    color: "#1E3A5F",
    highLabel: "Graves",
    lowLabel: "Leve",
    gradient: ["#4A5568", "#94A3B8", "#F1F5F9"],
  },
  hd_eye_bag: {
    color: "#E879A8",
    highLabel: "Graves",
    lowLabel: "Leve",
    gradient: ["#E879A8", "#F0A8C4", "#F8D4E2"],
  },
  hd_firmness: {
    color: "#7C3AED",
    highLabel: "Hundido",
    lowLabel: "Firme",
    gradient: ["#6D28D9", "#A78BFA", "#EDE9FE"],
  },
  hd_texture: {
    color: "#7C3AED",
    highLabel: "Bultos",
    lowLabel: "Marcas",
    // Dos bloques, no un degradado: amarillo = bultos, azul = marcas.
    gradient: ["#FACC15", "#FACC15", "#1E3A8A", "#1E3A8A"],
  },
  hd_tear_trough: {
    color: "#CA8A04",
    highLabel: "Grave",
    lowLabel: "Leve",
    gradient: ["#A16207", "#EAB308", "#FEF08A"],
  },
  hd_droopy_upper_eyelid: {
    color: "#A855F7",
    highLabel: "Caído",
    lowLabel: "Normal",
    gradient: ["#9333EA", "#A855F7", "#C084FC"],
  },
  hd_droopy_lower_eyelid: {
    color: "#DB2777",
    highLabel: "Caído",
    lowLabel: "Normal",
    gradient: ["#DB2777", "#E879A8", "#E8C4D4"],
  },
};

const DEFAULT_CONVENTION: MetricConvention = {
  color: DEFAULT_COLOR,
  highLabel: "Muy intenso",
  lowLabel: "Ligeramente",
  gradient: [DEFAULT_COLOR, "#9A9CF6", "#D3D4FB"],
};

export function metricConvention(type: string): MetricConvention {
  return CONVENTIONS[type] ?? DEFAULT_CONVENTION;
}

/** Leyenda de la máscara de tipo de piel. */
export const SKIN_TYPE_OVERLAYS = [
  { key: "dryness", label: "Resequedad", color: "#5D3A2C", intensityLabel: "Baja" },
  { key: "oiliness", label: "Oleosidad", color: "#F08000", intensityLabel: "Baja" },
  { key: "redness", label: "Rojeces", color: "#C62828", intensityLabel: "Baja" },
] as const;

export const SKIN_TYPE_ZONES = [
  { key: "t_zone", label: "Zona T", dashed: true },
  { key: "u_zone", label: "Zona U", dashed: false },
] as const;

/** Leyenda de la máscara de acné. */
export const ACNE_OVERLAYS = [
  { key: "blackheads", label: "Puntos Negros", color: "#2C2C2C" },
  { key: "whiteheads", label: "Espinillas", color: "#FFFFFF" },
  { key: "papules", label: "Barros", color: "#7EB8D8" },
] as const;
