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

export function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
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

export function matchesSkinAgeRule(
  difference: number,
  rule: { minDifference: number; maxDifference: number; isActive: boolean },
): boolean {
  if (!rule.isActive) return false;
  return difference >= rule.minDifference && difference <= rule.maxDifference;
}

export function pickBestMatchingRule<
  T extends {
    minDifference: number;
    maxDifference: number;
    isActive: boolean;
    priority: string;
    sortOrder: number;
  },
>(rules: T[], difference: number): T | null {
  const matches = rules.filter((rule) => matchesSkinAgeRule(difference, rule));
  if (matches.length === 0) return null;
  return matches.sort(
    (a, b) =>
      (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0) ||
      a.sortOrder - b.sortOrder,
  )[0];
}

export function buildSimulationSnapshot(birthDate: string, skinAgeYears: number) {
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
