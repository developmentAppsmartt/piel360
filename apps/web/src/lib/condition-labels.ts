import { CONDITIONABLE_METRIC_TYPES } from "@piel360/shared";
import {
  YOUCAM_METRIC_LABELS,
  youcamRegionLabel,
  youcamSkinTypeLabel,
} from "@/lib/youcam-metric-labels";

export type ConditionOperator = "lt" | "lte" | "eq" | "gte" | "gt";

export interface ConditionLike {
  metricType: string;
  region?: string | null;
  operator: string;
  value: number | null;
  /** Solo `hd_skin_type` — categórica, alternativa a `value`. */
  textValue?: string | null;
}

/** Métricas disponibles para condicionar — las 16 de YouCam más `all`
 * ("Salud de la piel") y `skin_age` ("Salud de la piel (años)"). Incluye
 * `hd_skin_type`, categórica — ver `isSkinTypeMetric`. */
export const CONDITION_METRICS = CONDITIONABLE_METRIC_TYPES;

/** Métricas con sub-regiones seleccionables en el formulario — sin entrada
 * acá, la condición aplica al puntaje/valor general ("whole") sin selector.
 * Refleja las regiones reales que YouCam devuelve para cada tipo (ver
 * docs/anallisis42prod.json). */
export const CONDITION_METRIC_REGIONS: Record<string, string[]> = {
  hd_wrinkle: [
    "whole",
    "forehead",
    "glabellar",
    "crowfeet",
    "periocular",
    "nasolabial",
    "marionette",
  ],
  hd_pore: ["whole", "forehead", "nose", "cheek"],
  hd_skin_type: ["whole", "t_zone", "u_zone"],
};

export function isSkinTypeMetric(metricType: string): boolean {
  return metricType === "hd_skin_type";
}

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

  if (isSkinTypeMetric(condition.metricType)) {
    const value = condition.textValue ? youcamSkinTypeLabel(condition.textValue) : "—";
    return `Se recomienda ${subjectPhrase} cuando ${metric}${region} sea ${value}`;
  }

  const operator = conditionOperatorLabel(condition.operator).toLowerCase();

  if (condition.metricType === "skin_age") {
    return `Se recomienda ${subjectPhrase} cuando la diferencia de edad de piel (edad de piel − edad real) sea ${operator} ${condition.value}`;
  }

  return `Se recomienda ${subjectPhrase} cuando ${metric}${region} sea ${operator} ${condition.value}`;
}
