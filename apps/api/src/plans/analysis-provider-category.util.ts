/**
 * Categoría segura de un proveedor de análisis, derivada del `slug` real
 * (nunca expuesto al cliente — ver plans.service.ts/subscriptions.service.ts).
 * Le da al frontend algo estable para distinguir "el plan estético" del "el
 * plan dermatológico" sin revelar qué API de terceros hay detrás.
 */
export type AnalysisProviderCategory = 'dermatologico' | 'estetico' | 'fototipo';

const CATEGORY_BY_SLUG: Record<string, AnalysisProviderCategory> = {
  skiniver: 'dermatologico',
  youcam: 'estetico',
  fitzpatrick: 'fototipo',
};

export function categoryForSlug(slug: string): AnalysisProviderCategory {
  return CATEGORY_BY_SLUG[slug] ?? 'dermatologico';
}
