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
};

const DEFAULT_CONVENTION: YoucamMetricConvention = {
  color: '#6366F1',
  highLabel: 'Muy intenso',
  lowLabel: 'Ligeramente',
};

export const YOUCAM_METRIC_CONVENTIONS: Record<string, YoucamMetricConvention> =
  {
    hd_oiliness: {
      color: '#F97316',
      highLabel: 'Muy graso',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Oleosidad',
    },
    hd_moisture: {
      color: '#38BDF8',
      highLabel: 'Muy seco',
      lowLabel: 'Bien hidratado',
      badgeLabel: 'Hidratación',
    },
    hd_acne: {
      color: '#22C55E',
      highLabel: 'Muy marcado',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Acné',
    },
    hd_wrinkle: {
      color: '#A78BFA',
      highLabel: 'Muy marcado',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Arrugas',
    },
    hd_pore: {
      color: '#FBBF24',
      highLabel: 'Muy visibles',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Poros',
    },
    hd_redness: {
      color: '#EF4444',
      highLabel: 'Muy rojo',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Enrojecimiento',
    },
    hd_age_spot: {
      color: '#D97706',
      highLabel: 'Muy visibles',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Manchas',
    },
    hd_radiance: {
      color: '#000000',
      highLabel: 'Poco brillo',
      lowLabel: 'Muy luminosa',
      badgeLabel: 'Luminosidad',
    },
    hd_dark_circle: {
      color: '#64748B',
      highLabel: 'Muy marcadas',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Ojeras',
    },
    hd_eye_bag: {
      color: '#FB7185',
      highLabel: 'Muy marcadas',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Bolsas',
    },
    hd_firmness: {
      color: '#8B5CF6',
      highLabel: 'Poca firmeza',
      lowLabel: 'Muy firme',
      badgeLabel: 'Firmeza',
    },
    hd_texture: {
      color: '#94A3B8',
      highLabel: 'Irregular',
      lowLabel: 'Suave',
      badgeLabel: 'Textura',
    },
    hd_tear_trough: {
      color: '#EAB308',
      highLabel: 'Muy marcado',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Lagrimal',
    },
    hd_droopy_upper_eyelid: {
      color: '#C084FC',
      highLabel: 'Muy caído',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Párpado sup.',
    },
    hd_droopy_lower_eyelid: {
      color: '#E879F9',
      highLabel: 'Muy caído',
      lowLabel: 'Ligeramente',
      badgeLabel: 'Párpado inf.',
    },
  };

export function youcamMetricConvention(
  type: string | null | undefined,
): YoucamMetricConvention {
  if (!type) return DEFAULT_CONVENTION;
  return YOUCAM_METRIC_CONVENTIONS[type] ?? DEFAULT_CONVENTION;
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
