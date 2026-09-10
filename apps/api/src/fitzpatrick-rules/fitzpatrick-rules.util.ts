import type { CreateFitzpatrickRuleDto } from './dto/fitzpatrick-rule.dto';

export const PRIORITY_WEIGHT: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  very_high: 4,
};

export function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/** Semilla inicial — una regla por fototipo, sin recomendaciones vinculadas
 * todavía (el doctor las completa). Descripciones alineadas con el copy
 * clínico de apps/web/src/lib/fitzpatrick-labels.ts. */
export const DEFAULT_FITZPATRICK_RULES: Omit<
  CreateFitzpatrickRuleDto,
  'routineIds' | 'treatmentIds' | 'productGroupIds' | 'supplementGroupIds'
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
    description: 'Piel marrón clara, a veces se quema, se broncea gradualmente.',
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

export function matchesFitzpatrickRule(
  scale: string,
  rule: { fitzpatrickScale: string; isActive: boolean },
): boolean {
  if (!rule.isActive) return false;
  return rule.fitzpatrickScale === scale;
}

export function pickBestMatchingRule<
  T extends {
    fitzpatrickScale: string;
    isActive: boolean;
    priority: string;
    sortOrder: number;
  },
>(rules: T[], scale: string): T | null {
  const matches = rules.filter((rule) => matchesFitzpatrickRule(scale, rule));
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) =>
      (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0) ||
      a.sortOrder - b.sortOrder,
  )[0];
}
