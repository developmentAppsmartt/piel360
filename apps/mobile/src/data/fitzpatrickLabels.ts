/** Espejo de apps/web/src/lib/fitzpatrick-labels.ts (docs/ai_fitzpatrick_skin_type.md). */

export const FITZPATRICK_SCALES = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
export type FitzpatrickScale = (typeof FITZPATRICK_SCALES)[number];

export type FitzpatrickResult = {
  fitzpatrick_scale: FitzpatrickScale;
  timed: number;
};

export function isFitzpatrickScale(value: string): value is FitzpatrickScale {
  return (FITZPATRICK_SCALES as readonly string[]).includes(value);
}

/** Extrae escala I–VI desde un análisis de fototipo. */
export function scaleFromFitzpatrickAnalysis(row: {
  aiRawResponse?: unknown;
  aiDiagnosis?: string | null;
  finalDiagnosis?: string | null;
}): FitzpatrickScale | null {
  const raw = row.aiRawResponse as FitzpatrickResult | null | undefined;
  const fromRaw = raw?.fitzpatrick_scale?.trim();
  if (fromRaw && isFitzpatrickScale(fromRaw)) return fromRaw;

  const text = `${row.finalDiagnosis ?? ''} ${row.aiDiagnosis ?? ''}`;
  const match = text.match(/\b(I{1,3}|IV|V|VI)\b/i)?.[1]?.toUpperCase();
  if (match && isFitzpatrickScale(match)) return match;
  return null;
}

/**
 * Valor por defecto para edición: último análisis de fototipo si existe;
 * si no, el fototipo guardado en el perfil del paciente.
 */
export function resolveLatestFitzpatrickType(
  patient: { fitzpatrickType?: string | null },
  analyses: Array<{
    fitzpatrickTaskId?: string | null;
    aiRawResponse?: unknown;
    aiDiagnosis?: string | null;
    finalDiagnosis?: string | null;
    createdAt: string;
  }> = [],
): FitzpatrickScale | '' {
  const latest = [...analyses]
    .filter((a) => !!a.fitzpatrickTaskId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

  if (latest) {
    const fromAnalysis = scaleFromFitzpatrickAnalysis(latest);
    if (fromAnalysis) return fromAnalysis;
  }

  const fromPatient = patient.fitzpatrickType?.trim();
  if (fromPatient && isFitzpatrickScale(fromPatient)) return fromPatient;
  return '';
}

export const FITZPATRICK_TYPES: Record<
  FitzpatrickScale,
  { label: string; colorHex: string; reaction: string }
> = {
  I: {
    label: 'Blanca',
    colorHex: '#f5d5c0',
    reaction: 'Casi siempre se quema, nunca se broncea.',
  },
  II: {
    label: 'Beige',
    colorHex: '#e8bfa0',
    reaction: 'Usualmente se quema, se broncea mínimamente.',
  },
  III: {
    label: 'Marrón claro',
    colorHex: '#c99873',
    reaction: 'A veces se quema, se broncea gradualmente.',
  },
  IV: {
    label: 'Marrón medio',
    colorHex: '#a8754f',
    reaction: 'Rara vez se quema, se broncea fácilmente.',
  },
  V: {
    label: 'Marrón oscuro',
    colorHex: '#6b4530',
    reaction: 'Muy rara vez se quema.',
  },
  VI: {
    label: 'Negro',
    colorHex: '#3b2318',
    reaction: 'Casi nunca se quema.',
  },
};
