import { YOUCAM_DST_ACTIONS } from "@piel360/shared";
import { YOUCAM_METRIC_LABELS, youcamRegionLabel } from "@/lib/youcam-metric-labels";

export type ConditionOperator = "lt" | "lte" | "eq" | "gte" | "gt";

export interface ConditionLike {
  metricType: string;
  region?: string | null;
  operator: string;
  value: number;
}

/** Métricas disponibles para condicionar — todas las de YouCam salvo
 * hd_skin_type (da una categoría de texto, no un puntaje numérico). */
export const CONDITION_METRICS = YOUCAM_DST_ACTIONS.filter(
  (type) => type !== "hd_skin_type",
);

export const CONDITION_OPERATORS: {
  value: ConditionOperator;
  symbol: string;
  label: string;
}[] = [
  { value: "lt", symbol: "<", label: "Menor que" },
  { value: "lte", symbol: "≤", label: "Menor o igual a" },
  { value: "eq", symbol: "=", label: "Igual a" },
  { value: "gte", symbol: "≥", label: "Mayor o igual a" },
  { value: "gt", symbol: ">", label: "Mayor que" },
];

export function conditionMetricLabel(metricType: string): string {
  return YOUCAM_METRIC_LABELS[metricType] ?? metricType;
}

export function conditionOperatorLabel(operator: string): string {
  return CONDITION_OPERATORS.find((o) => o.value === operator)?.label ?? operator;
}

/** Frase en lenguaje natural para una condición — el elemento clave del
 * onboarding: un doctor/enfermero sin experiencia en condicionales entiende
 * qué está configurando sin leer documentación. `subjectPhrase` parametriza
 * el sujeto de la frase ("esta rutina" / "este tratamiento"). */
export function conditionSentence(condition: ConditionLike, subjectPhrase: string): string {
  const metric = conditionMetricLabel(condition.metricType);
  const region = condition.region ? ` (${youcamRegionLabel(condition.region)})` : "";
  const operator = conditionOperatorLabel(condition.operator).toLowerCase();
  return `Se recomienda ${subjectPhrase} cuando ${metric}${region} sea ${operator} ${condition.value}`;
}
