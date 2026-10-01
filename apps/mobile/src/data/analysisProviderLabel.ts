/** Labels visibles al usuario — siempre marca Piel 360, sin nombres de API. */

export const ANALYSIS_PROVIDER_STATIC_LABELS = {
  skiniver: 'Análisis Dermatológico Piel 360',
  youcam: 'Análisis Estético Piel 360',
  fitzpatrick: 'Análisis de Fototipo Piel 360',
} as const;

export type AnalysisProviderSlug = keyof typeof ANALYSIS_PROVIDER_STATIC_LABELS;

const PROVIDER_ORDER: AnalysisProviderSlug[] = [
  'skiniver',
  'youcam',
  'fitzpatrick',
];

export function isAnalysisProviderSlug(
  value: string,
): value is AnalysisProviderSlug {
  return value in ANALYSIS_PROVIDER_STATIC_LABELS;
}

/** Espejo de PROVIDER_PUBLIC_ALIASES en @piel360/shared: el API enmascara
 * los slugs internos en sus respuestas (suscripciones, solicitudes, etc.). */
const PUBLIC_PROVIDER_ALIASES: Record<string, AnalysisProviderSlug> = {
  analisispiel360: 'youcam',
  analisisdermapiel360: 'skiniver',
};

/** Slug interno a partir del interno o de su alias público; `null` si no aplica. */
export function toAnalysisProviderSlug(
  value: string | null | undefined,
): AnalysisProviderSlug | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (isAnalysisProviderSlug(normalized)) return normalized;
  return PUBLIC_PROVIDER_ALIASES[normalized] ?? null;
}

export function providerStaticLabel(slug: string): string {
  const internal = toAnalysisProviderSlug(slug);
  return internal ? ANALYSIS_PROVIDER_STATIC_LABELS[internal] : 'Piel 360';
}

/** Label para un análisis existente: prioriza `provider.displayLabel` si no es un nombre de API. */
export function analysisProviderLabel(row: {
  youcamTaskId?: string | null;
  fitzpatrickTaskId?: string | null;
  provider?: { displayLabel: string | null } | null;
}): string {
  const raw = row.provider?.displayLabel?.trim();
  if (raw && !looksLikeApiVendor(raw)) return maskVendorMessage(raw);
  if (row.youcamTaskId) return ANALYSIS_PROVIDER_STATIC_LABELS.youcam;
  if (row.fitzpatrickTaskId) return ANALYSIS_PROVIDER_STATIC_LABELS.fitzpatrick;
  return ANALYSIS_PROVIDER_STATIC_LABELS.skiniver;
}

function looksLikeApiVendor(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes('skiniver') ||
    lower.includes('youcam') ||
    lower.includes('fitzpatrick') ||
    lower.includes('perfect')
  );
}

/** Sustituye nombres de proveedor/API en textos que ve el usuario (alertas, toasts). */
export function maskVendorMessage(message: string): string {
  return message
    .replace(/\bPerfect\s*Corp\b/gi, 'Análisis Estético Piel 360')
    .replace(/\bPerfectCorp\b/gi, 'Análisis Estético Piel 360')
    .replace(/\bYouCam\b/gi, 'Análisis Estético Piel 360')
    .replace(/\bYoucam\b/gi, 'Análisis Estético Piel 360')
    .replace(/\bSkiniver\b/gi, 'Análisis Dermatológico Piel 360');
}

export type AnalysisStatusKind =
  | 'invalid'
  | 'corrected'
  | 'confirmed'
  | 'pending';

export function analysisStatus(row: {
  isValid?: boolean;
  isConfirmed?: boolean;
  isCorrected?: boolean;
}): { kind: AnalysisStatusKind; label: string } {
  if (row.isValid === false) return { kind: 'invalid', label: 'Inválido' };
  if (row.isConfirmed) {
    return row.isCorrected
      ? { kind: 'corrected', label: 'Corregido' }
      : { kind: 'confirmed', label: 'Confirmado' };
  }
  return { kind: 'pending', label: 'Pendiente' };
}

export type AvailableAnalysisProvider = {
  slug: AnalysisProviderSlug;
  label: string;
  remainingCredits: number;
};

/** Providers con suscripción activa y créditos restantes (>0), orden CRM. */
export function availableProvidersFromSubscriptions(
  subscriptions: Array<{
    status: string;
    remainingCredits: number;
    endsAt?: string | null;
    plan: {
      provider: {
        slug: string;
        name: string;
        displayLabel?: string | null;
      };
    };
  }>,
): AvailableAnalysisProvider[] {
  const bySlug = new Map<AnalysisProviderSlug, AvailableAnalysisProvider>();

  const now = Date.now();
  for (const sub of subscriptions) {
    if (sub.status !== 'active' || sub.remainingCredits <= 0) continue;
    if (sub.endsAt && new Date(sub.endsAt).getTime() <= now) continue;
    const slug = toAnalysisProviderSlug(sub.plan.provider.slug);
    if (!slug) continue;

    const existing = bySlug.get(slug);
    if (existing) {
      existing.remainingCredits += sub.remainingCredits;
      continue;
    }

    const display = sub.plan.provider.displayLabel?.trim();
    bySlug.set(slug, {
      slug,
      label:
        display && !looksLikeApiVendor(display)
          ? display
          : ANALYSIS_PROVIDER_STATIC_LABELS[slug],
      remainingCredits: sub.remainingCredits,
    });
  }

  return PROVIDER_ORDER.filter((slug) => bySlug.has(slug)).map(
    (slug) => bySlug.get(slug)!,
  );
}
