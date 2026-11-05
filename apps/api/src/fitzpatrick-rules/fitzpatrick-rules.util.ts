import { scopeMatches } from '../skin-age-rules/skin-age-rules.util';
import type { CreateFitzpatrickRuleDto } from './dto/fitzpatrick-rule.dto';

export const PRIORITY_WEIGHT: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  very_high: 4,
};

export function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
}

/** Semilla inicial — una regla por fototipo, sin recomendaciones vinculadas
 * todavía (el doctor las completa). Descripciones alineadas con el copy
 * clínico de apps/web/src/lib/fitzpatrick-labels.ts. */
export const DEFAULT_FITZPATRICK_RULES: Omit<
  CreateFitzpatrickRuleDto,
  | 'routineIds'
  | 'treatmentIds'
  | 'productGroupIds'
  | 'supplementGroupIds'
  | 'skinTypes'
>[] = [
  {
    label: 'Fototipo I',
    description: 'Piel muy clara, casi siempre se quema, nunca se broncea.',
    fitzpatrickScale: 'I',
    priority: 'medium',
    colorKey: 'blue',
    sortOrder: 0,
  },
  {
    label: 'Fototipo II',
    description: 'Piel clara, usualmente se quema, se broncea mínimamente.',
    fitzpatrickScale: 'II',
    priority: 'medium',
    colorKey: 'blue',
    sortOrder: 1,
  },
  {
    label: 'Fototipo III',
    description:
      'Piel marrón clara, a veces se quema, se broncea gradualmente.',
    fitzpatrickScale: 'III',
    priority: 'medium',
    colorKey: 'orange',
    sortOrder: 2,
  },
  {
    label: 'Fototipo IV',
    description: 'Piel marrón media, rara vez se quema, se broncea fácilmente.',
    fitzpatrickScale: 'IV',
    priority: 'medium',
    colorKey: 'amber',
    sortOrder: 3,
  },
  {
    label: 'Fototipo V',
    description: 'Piel marrón oscura, muy rara vez se quema.',
    fitzpatrickScale: 'V',
    priority: 'medium',
    colorKey: 'amber',
    sortOrder: 4,
  },
  {
    label: 'Fototipo VI',
    description: 'Piel negra, casi nunca se quema.',
    fitzpatrickScale: 'VI',
    priority: 'medium',
    colorKey: 'red',
    sortOrder: 5,
  },
];

type MatchableRule = {
  fitzpatrickScale: string;
  skinTypes: string[];
  isActive: boolean;
  priority: string;
  sortOrder: number;
};

/** Fototipo exacto y, si la regla limita biotipos, que el del paciente esté
 * entre ellos (mismo criterio que las reglas de edad de piel). */
export function matchesFitzpatrickRule(
  scale: string,
  skinType: string | null,
  rule: MatchableRule,
): boolean {
  if (!rule.isActive) return false;
  return (
    rule.fitzpatrickScale === scale && scopeMatches(rule.skinTypes, skinType)
  );
}

/** Con varias coincidiendo gana la que limita biotipos (la más específica);
 * si empatan, la prioridad y luego el orden. */
export function pickBestMatchingRule<T extends MatchableRule>(
  rules: T[],
  scale: string,
  skinType: string | null,
): T | null {
  const matches = rules.filter((rule) =>
    matchesFitzpatrickRule(scale, skinType, rule),
  );
  if (matches.length === 0) return null;
  const specificity = (rule: T) => (rule.skinTypes.length > 0 ? 1 : 0);
  return matches.sort(
    (a, b) =>
      specificity(b) - specificity(a) ||
      (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0) ||
      a.sortOrder - b.sortOrder,
  )[0];
}
