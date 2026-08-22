import {
  CONDITION_METRICS,
  CONDITION_OPERATORS,
  conditionMetricLabel,
  conditionOperatorLabel,
  conditionSentence,
  type ConditionLike,
} from "@/lib/condition-labels";

export const ROUTINE_CONDITION_METRICS = CONDITION_METRICS;
export const ROUTINE_CONDITION_OPERATORS = CONDITION_OPERATORS;
export const routineMetricLabel = conditionMetricLabel;
export const routineOperatorLabel = conditionOperatorLabel;

export function routineConditionSentence(condition: ConditionLike): string {
  return conditionSentence(condition, "esta rutina");
}
