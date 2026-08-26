/** Colores y leyenda de intensidad por métrica YouCam (máscara / resultado). */

export type YoucamMetricConvention = {
  /** Color principal del chip y de la barra. */
  color: string;
  /** Extremo intenso (arriba en la barra). */
  highLabel: string;
  /** Extremo leve (abajo en la barra). */
  lowLabel: string;
  /** Título corto en el badge (p. ej. "Oleosidad"). */
  badgeLabel?: string;
  /** Gradiente custom (arriba → abajo). Si no hay, se deriva de `color`. */
  gradient?: readonly string[];
  /** Si true, no muestra el chip de color encima de la barra (el título va en el viewer). */
  hideBarBadge?: boolean;
  /** Si true, no muestra highLabel / lowLabel (solo la barra de color). */
  hideScaleLabels?: boolean;
};

const DEFAULT_CONVENTION: YoucamMetricConvention = {
  color: '#6366F1',
  highLabel: 'Muy intenso',
  lowLabel: 'Ligeramente',
};

/** Todas las métricas YouCam con leyenda estilo Perfect Corp. */
export const YOUCAM_METRIC_CONVENTIONS: Record<string, YoucamMetricConvention> =
  {
    hd_oiliness: {
      color: '#F5A623',
      highLabel: 'Muy graso',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Oleosidad',
      gradient: ['#F5A623', '#C4783A', '#5C4A28'],
      hideBarBadge: true,
    },
    hd_moisture: {
      color: '#14B8A6',
      highLabel: 'Seca',
      lowLabel: 'Hidratado',
      badgeLabel: 'Humedad',
      // Perfect Corp thermal: rojo → rosa → amarillo → verde → azul
      gradient: ['#E53935', '#EC407A', '#FFEB3B', '#66BB6A', '#29B6F6'],
      hideBarBadge: true,
    },
    hd_acne: {
      color: '#7EB8D8',
      highLabel: 'Muy marcado',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Acné',
      hideBarBadge: true,
    },
    hd_wrinkle: {
      color: '#22C55E',
      highLabel: 'Líneas profundas',
      lowLabel: 'Líneas finas',
      badgeLabel: 'Arrugas',
      // Perfect Corp: verde oscuro → verde claro
      gradient: ['#15803D', '#22C55E', '#BBF7D0'],
      hideBarBadge: true,
    },
    hd_pore: {
      color: '#0D9488',
      highLabel: 'Grave',
      lowLabel: 'Leve',
      badgeLabel: 'Poros',
      // Perfect Corp: teal oscuro → menta claro
      gradient: ['#0F766E', '#14B8A6', '#99F6E4'],
      hideBarBadge: true,
    },
    hd_redness: {
      color: '#F97316',
      highLabel: 'Muy rojo',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Eritema',
      // Perfect Corp: naranja vivo → melocotón claro
      gradient: ['#EA580C', '#FB923C', '#FED7AA'],
      hideBarBadge: true,
    },
    hd_age_spot: {
      color: '#1E3A5F',
      highLabel: 'Puntos Negros',
      lowLabel: 'Puntos Claros',
      badgeLabel: 'Manchas',
      gradient: ['#0B1F3A', '#3D7EA6', '#B8EAF5'],
      hideBarBadge: true,
    },
    hd_radiance: {
      color: '#111827',
      highLabel: 'Sin Brillo',
      lowLabel: 'Radiante',
      badgeLabel: 'Brillo',
      gradient: ['#111827', '#6B7280', '#F9FAFB'],
      hideBarBadge: true,
    },
    hd_dark_circle: {
      color: '#1E3A5F',
      highLabel: 'Graves',
      lowLabel: 'Leve',
      badgeLabel: 'Ojeras',
      gradient: ['#4A5568', '#94A3B8', '#F1F5F9'],
      hideBarBadge: true,
    },
    hd_eye_bag: {
      color: '#E879A8',
      highLabel: 'Graves',
      lowLabel: 'Leve',
      badgeLabel: 'Bolsas de ojos',
      gradient: ['#E879A8', '#F0A8C4', '#F8D4E2'],
      hideBarBadge: true,
    },
    hd_firmness: {
      color: '#7C3AED',
      highLabel: 'Hundido',
      lowLabel: 'Firme',
      badgeLabel: 'Firmeza',
      gradient: ['#6D28D9', '#A78BFA', '#EDE9FE'],
      hideBarBadge: true,
    },
    hd_texture: {
      color: '#7C3AED',
      highLabel: 'Bultos',
      lowLabel: 'Marcas',
      badgeLabel: 'Textura',
      // Perfect Corp: amarillo (bultos) → azul oscuro (marcas)
      gradient: ['#FACC15', '#FACC15', '#1E3A8A', '#1E3A8A'],
      hideBarBadge: true,
    },
    hd_tear_trough: {
      color: '#CA8A04',
      highLabel: 'Grave',
      lowLabel: 'Leve',
      badgeLabel: 'Surco lagrimal',
      gradient: ['#A16207', '#EAB308', '#FEF08A'],
      hideBarBadge: true,
    },
    hd_droopy_upper_eyelid: {
      color: '#A855F7',
      highLabel: 'Caído',
      lowLabel: 'Normal',
      badgeLabel: 'Párpado superior caído',
      // Perfect Corp: morado brillante uniforme
      gradient: ['#9333EA', '#A855F7', '#C084FC'],
      hideBarBadge: true,
    },
    hd_droopy_lower_eyelid: {
      color: '#DB2777',
      highLabel: 'Caído',
      lowLabel: 'Normal',
      badgeLabel: 'Párpado inferior',
      gradient: ['#DB2777', '#E879A8', '#E8C4D4'],
      hideBarBadge: true,
    },
  };

/**
 * Convención de máscara `hd_skin_type` (Perfect Corp):
 * overlays de resequedad / oleosidad / rojeces + líneas Zona T / Zona U.
 */
export const YOUCAM_SKIN_TYPE_OVERLAYS = [
  {
    key: 'dryness',
    label: 'Resequedad',
    color: '#5D3A2C',
    intensityLabel: 'Baja',
  },
  {
    key: 'oiliness',
    label: 'Oleosidad',
    color: '#F08000',
    intensityLabel: 'Baja',
  },
  {
    key: 'redness',
    label: 'Rojeces',
    color: '#C62828',
    intensityLabel: 'Baja',
  },
] as const;

export const YOUCAM_SKIN_TYPE_ZONES = [
  { key: 't_zone', label: 'Zona T', lineStyle: 'dashed' as const },
  { key: 'u_zone', label: 'Zona U', lineStyle: 'solid' as const },
] as const;

/**
 * Convención de máscara `hd_acne` (Perfect Corp):
 * Puntos negros / Espinillas / Barros.
 */
export const YOUCAM_ACNE_OVERLAYS = [
  { key: 'blackheads', label: 'Puntos Negros', color: '#2C2C2C' },
  { key: 'whiteheads', label: 'Espinillas', color: '#FFFFFF' },
  { key: 'papules', label: 'Barros', color: '#7EB8D8' },
] as const;

export function youcamMetricConvention(
  type: string | null | undefined,
): YoucamMetricConvention {
  if (!type) return DEFAULT_CONVENTION;
  return YOUCAM_METRIC_CONVENTIONS[type] ?? DEFAULT_CONVENTION;
}

/** Badge del viewer (izq.) cuando la métrica oculta el chip de la barra. */
export function youcamViewerBadgeLabel(
  type: string | null | undefined,
): string | null {
  if (!type) return null;
  const c = youcamMetricConvention(type);
  if (!c.hideBarBadge) return null;
  return c.badgeLabel ?? null;
}

/** Intensidad de la condición (0 = leve, 100 = muy intenso). Score YouCam alto = mejor. */
export function youcamConditionIntensity(score: number | null): number | null {
  if (score == null || Number.isNaN(score)) return null;
  return Math.max(0, Math.min(100, 100 - score));
}

function softHex(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) =>
    Math.round(c + (255 - c) * Math.max(0, Math.min(1, amount)));
  const to = (c: number) => c.toString(16).padStart(2, '0');
  return `#${to(mix(r))}${to(mix(g))}${to(mix(b))}`;
}

/** Gradiente vertical de la convención: intenso → leve. */
export function youcamConventionGradient(color: string): [string, string, string] {
  return [color, softHex(color, 0.35), softHex(color, 0.72)];
}
