import { z } from "zod";
import {
  CONDITION_METRICS,
  CONDITION_METRIC_REGIONS,
  conditionMetricLabel,
  isSkinTypeMetric,
  type ConditionLike,
  type ConditionOperator,
} from "@/lib/condition-labels";
import { analisisPiel360RegionLabel } from "@/lib/youcam-metric-labels";
import type { ConditionRowValues } from "./condition-row";

const VALUE_MIN = 0;
const VALUE_MAX = 100;

/** Error de un valor numérico, o null. Los puntajes van de 0 a 100. */
function numberError(raw: string | undefined): string | null {
  const value = parseFloat(raw ?? "");
  if (!raw || Number.isNaN(value)) return "Selecciona un valor";
  if (value < VALUE_MIN || value > VALUE_MAX) {
    return `El valor debe estar entre ${VALUE_MIN} y ${VALUE_MAX}`;
  }
  return null;
}

const conditionSchema = z
  .object({
    metricType: z.string().min(1, "Selecciona una métrica"),
    region: z.string().optional(),
    operator: z.enum(["lt", "lte", "eq", "gte", "gt", "between"]),
    value: z.string().optional(),
    valueTo: z.string().optional(),
    textValue: z.string().optional(),
  })
  .superRefine((c, ctx) => {
    // Sin zona elegida, el desplegable quedaba en blanco y se guardaba igual.
    const regions = CONDITION_METRIC_REGIONS[c.metricType];
    if (regions && !regions.includes(c.region ?? "")) {
      ctx.addIssue({ code: "custom", path: ["region"], message: "Selecciona la zona" });
    }
    if (isSkinTypeMetric(c.metricType)) {
      if (!c.textValue) {
        ctx.addIssue({ code: "custom", path: ["value"], message: "Selecciona un valor" });
      }
      return;
    }
    const valueError = numberError(c.value);
    if (valueError) ctx.addIssue({ code: "custom", path: ["value"], message: valueError });
    const toError = c.operator === "between" ? numberError(c.valueTo) : null;
    if (toError) ctx.addIssue({ code: "custom", path: ["valueTo"], message: toError });
  });

/** Misma métrica y misma zona = la misma condición: dos rangos sobre el mismo
 * puntaje chocan. Arrugas de la frente y de la cara completa son puntajes
 * distintos y sí pueden convivir. */
export function conditionKey(c: { metricType: string; region?: string | null }): string {
  return CONDITION_METRIC_REGIONS[c.metricType]
    ? `${c.metricType}|${c.region ?? ""}`
    : `${c.metricType}|`;
}

function conditionName(c: { metricType: string; region?: string | null }): string {
  const metric = conditionMetricLabel(c.metricType);
  return CONDITION_METRIC_REGIONS[c.metricType] && c.region
    ? `${metric} (${analisisPiel360RegionLabel(c.region)})`
    : metric;
}

export const conditionsSchema = z.array(conditionSchema).superRefine((list, ctx) => {
  const seen = new Set<string>();
  list.forEach((c, index) => {
    const key = conditionKey(c);
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: [index, "metricType"],
        message: `${conditionName(c)} ya tiene una condición`,
      });
    }
    seen.add(key);
  });
});

/** La primera métrica que todavía tiene una combinación libre, o null. */
export function firstFreeMetric(
  usedKeys: string[],
  excludedMetrics?: string[],
): string | null {
  return (
    CONDITION_METRICS.find(
      (metric) => !excludedMetrics?.includes(metric) && metricHasFreeKey(metric, usedKeys),
    ) ?? null
  );
}

export function metricHasFreeKey(metric: string, usedKeys: string[]): boolean {
  const regions = CONDITION_METRIC_REGIONS[metric];
  return regions
    ? regions.some((region) => !usedKeys.includes(`${metric}|${region}`))
    : !usedKeys.includes(`${metric}|`);
}

/** De lo guardado al formulario. Una zona nula en una métrica con zonas pasa a
 * «Cara completa»: es lo que el motor ya hacía con ella, y así una condición
 * vieja no queda inválida al editar. */
export function toConditionFormValues(c: ConditionLike): ConditionRowValues {
  return {
    metricType: c.metricType,
    region: c.region ?? (CONDITION_METRIC_REGIONS[c.metricType] ? "whole" : ""),
    operator: c.operator as ConditionOperator,
    value: c.value != null ? String(c.value) : "",
    valueTo: c.valueTo != null ? String(c.valueTo) : "",
    textValue: c.textValue ?? "",
  };
}

/** Del formulario al API. La zona solo viaja en las métricas que la tienen: una
 * zona que quedó de otra métrica hacía que la condición no coincidiera nunca. */
export function toConditionInput(c: ConditionRowValues) {
  const region = CONDITION_METRIC_REGIONS[c.metricType] ? c.region || undefined : undefined;
  if (isSkinTypeMetric(c.metricType)) {
    return {
      metricType: c.metricType,
      region,
      operator: "eq" as const,
      value: null,
      textValue: c.textValue,
    };
  }
  return {
    metricType: c.metricType,
    region,
    operator: c.operator,
    value: parseFloat(c.value ?? ""),
    valueTo: c.operator === "between" ? parseFloat(c.valueTo ?? "") : undefined,
  };
}

type FieldError = { message?: string } | undefined;

/** El primer error de una fila, en el orden en que se leen los campos. */
export function conditionRowError(
  errors:
    | { metricType?: FieldError; region?: FieldError; value?: FieldError; valueTo?: FieldError }
    | undefined,
): string | undefined {
  return (
    errors?.metricType?.message ??
    errors?.region?.message ??
    errors?.value?.message ??
    errors?.valueTo?.message
  );
}
