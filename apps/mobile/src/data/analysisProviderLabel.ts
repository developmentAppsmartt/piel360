/** Labels visibles al usuario — siempre marca Piel 360, sin nombres de API. */

export const ANALYSIS_PROVIDER_STATIC_LABELS = {
  skiniver: 'Piel 360 AI · Dermatológico',
  youcam: 'Piel 360 AI · Estético',
  fitzpatrick: 'Piel 360 AI · Fototipo',
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

export function providerStaticLabel(slug: string): string {
  return isAnalysisProviderSlug(slug)
    ? ANALYSIS_PROVIDER_STATIC_LABELS[slug]
    : 'Piel 360 AI';
}

/** Label para un análisis existente: prioriza `provider.displayLabel` si no es un nombre de API. */
export function analysisProviderLabel(row: {
  youcamTaskId?: string | null;
  fitzpatrickTaskId?: string | null;
  provider?: { displayLabel: string | null } | null;
}): string {
  const raw = row.provider?.displayLabel?.trim();
  if (raw && !looksLikeApiVendor(raw)) return raw;
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

  for (const sub of subscriptions) {
    if (sub.status !== 'active' || sub.remainingCredits <= 0) continue;
    const slug = sub.plan.provider.slug;
    if (!isAnalysisProviderSlug(slug)) continue;

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
