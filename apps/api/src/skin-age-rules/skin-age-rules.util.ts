import {
  analisisPiel360SkinType,
  parseAnalisisPiel360Metrics,
  type AnalisisPiel360RawResponse,
} from '@piel360/shared';
import {
  chronologicalAgeYears,
  computeSkinAgeSnapshot,
  skinAgeDifferenceMessage,
} from '../youcam/skin-age-snapshot.util';
import type { CreateSkinAgeRuleDto } from './dto/skin-age-rule.dto';

export const PRIORITY_WEIGHT: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  very_high: 4,
};

/** Lista de strings no vacíos de una columna JSON (ids, biotipos, fototipos). */
export function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
}

export function formatDifferenceRange(
  minDifference: number,
  maxDifference: number,
): string {
  if (minDifference <= -100 && maxDifference <= -5) {
    return `≤ ${maxDifference} años`;
  }
  if (minDifference >= 8 && maxDifference >= 100) {
    return `≥ ${minDifference} años`;
  }
  if (minDifference === maxDifference) {
    return `${minDifference} años`;
  }
  return `${minDifference} a ${maxDifference} años`;
}

export const DEFAULT_SKIN_AGE_RULES: Omit<
  CreateSkinAgeRuleDto,
  'routineIds' | 'treatmentIds' | 'productGroupIds' | 'supplementGroupIds'
>[] = [
  {
    label: '≤ -5 años',
    description: 'La piel se ve mucho más joven que la edad cronológica.',
    minDifference: -100,
    maxDifference: -5,
    priority: 'high',
    colorKey: 'green',
    sortOrder: 0,
  },
  {
    label: '-4 a -1 años',
    description: 'La piel se ve ligeramente más joven que la edad cronológica.',
    minDifference: -4,
    maxDifference: -1,
    priority: 'medium',
    colorKey: 'blue',
    sortOrder: 1,
  },
  {
    label: '0 a +3 años',
    description: 'La piel corresponde a la edad cronológica.',
    minDifference: 0,
    maxDifference: 3,
    priority: 'medium',
    colorKey: 'orange',
    sortOrder: 2,
  },
  {
    label: '+4 a +7 años',
    description: 'La piel se ve más envejecida que la edad cronológica.',
    minDifference: 4,
    maxDifference: 7,
    priority: 'high',
    colorKey: 'amber',
    sortOrder: 3,
  },
  {
    label: '≥ +8 años',
    description: 'La piel se ve mucho más envejecida que la edad cronológica.',
    minDifference: 8,
    maxDifference: 100,
    priority: 'very_high',
    colorKey: 'red',
    sortOrder: 4,
  },
];

/** Biotipo y fototipo del paciente con los que se elige la regla; null =
 * no se conoce. */
export type SkinAgeRuleContext = {
  skinType: string | null;
  fitzpatrickScale: string | null;
};

export const NO_RULE_CONTEXT: SkinAgeRuleContext = {
  skinType: null,
  fitzpatrickScale: null,
};

type MatchableRule = {
  minDifference: number;
  maxDifference: number;
  isActive: boolean;
  priority: string;
  sortOrder: number;
  skinTypes: string[];
  fitzpatrickScales: string[];
};

/** Lista vacía = aplica a todos. Con valores, solo si el dato se conoce y
 * está en ella: una regla para piel grasa no se recomienda a quien no se le
 * sabe el biotipo. */
function scopeMatches(scope: string[], value: string | null): boolean {
  if (scope.length === 0) return true;
  if (!value) return false;
  return scope.some((item) => item.toLowerCase() === value.toLowerCase());
}

/** Cuántos alcances restringe la regla: con varias coincidiendo, gana la
 * más específica (pedido del cliente); si empatan, la prioridad. */
function specificity(rule: MatchableRule): number {
  return (
    (rule.skinTypes.length > 0 ? 1 : 0) +
    (rule.fitzpatrickScales.length > 0 ? 1 : 0)
  );
}

export function matchesSkinAgeRule(
  difference: number,
  rule: MatchableRule,
  context: SkinAgeRuleContext,
): boolean {
  if (!rule.isActive) return false;
  return (
    difference >= rule.minDifference &&
    difference <= rule.maxDifference &&
    scopeMatches(rule.skinTypes, context.skinType) &&
    scopeMatches(rule.fitzpatrickScales, context.fitzpatrickScale)
  );
}

export function pickBestMatchingRule<T extends MatchableRule>(
  rules: T[],
  difference: number,
  context: SkinAgeRuleContext,
): T | null {
  const matches = rules.filter((rule) =>
    matchesSkinAgeRule(difference, rule, context),
  );
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) =>
      specificity(b) - specificity(a) ||
      (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0) ||
      a.sortOrder - b.sortOrder,
  )[0];
}

/** Biotipo del análisis estético (el general, ver `analisisPiel360SkinType`)
 * y fototipo del paciente. El análisis estético no trae fototipo: lo deja en
 * `patients.fitzpatrick_type` el análisis de fototipo al completarse. */
export function skinAgeRuleContext(
  aiRawResponse: unknown,
  patientFitzpatrickType: string | null,
): SkinAgeRuleContext {
  const metrics = parseAnalisisPiel360Metrics(
    aiRawResponse as AnalisisPiel360RawResponse | null,
  );
  return {
    skinType: analisisPiel360SkinType(metrics),
    fitzpatrickScale: patientFitzpatrickType,
  };
}

export type SkinAgeRuleRow = {
  id: bigint;
  doctorId: bigint;
  label: string;
  description: string | null;
  minDifference: number;
  maxDifference: number;
  priority: string;
  colorKey: string;
  sortOrder: number;
  isActive: boolean;
  routineIds: unknown;
  treatmentIds: unknown;
  productGroupIds: unknown;
  supplementGroupIds: unknown;
  skinTypes: unknown;
  fitzpatrickScales: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeSkinAgeRule(rule: SkinAgeRuleRow) {
  return {
    id: rule.id.toString(),
    doctorId: rule.doctorId.toString(),
    label: rule.label,
    description: rule.description,
    minDifference: rule.minDifference,
    maxDifference: rule.maxDifference,
    priority: rule.priority,
    colorKey: rule.colorKey,
    sortOrder: rule.sortOrder,
    isActive: rule.isActive,
    routineIds: parseIdList(rule.routineIds),
    treatmentIds: parseIdList(rule.treatmentIds),
    productGroupIds: parseIdList(rule.productGroupIds),
    supplementGroupIds: parseIdList(rule.supplementGroupIds),
    skinTypes: parseIdList(rule.skinTypes),
    fitzpatrickScales: parseIdList(rule.fitzpatrickScales),
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export type SerializedSkinAgeRule = ReturnType<typeof serializeSkinAgeRule>;

export function buildSimulationSnapshot(
  birthDate: string,
  skinAgeYears: number,
) {
  const birth = new Date(birthDate);
  const at = new Date();
  const snap = computeSkinAgeSnapshot({
    skinAgeYears,
    birthDate: birth,
    analysisDate: at,
  });
  return {
    ...snap,
    message:
      snap.skinAgeDifference != null
        ? skinAgeDifferenceMessage(snap.skinAgeDifference)
        : null,
    chronologicalAgeYears:
      snap.chronologicalAgeYears ??
      (Number.isNaN(birth.getTime()) ? null : chronologicalAgeYears(birth, at)),
  };
}
