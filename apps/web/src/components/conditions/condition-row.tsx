"use client";

import type { FieldValues, UseFormRegister } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { YOUCAM_SKIN_TYPE_VALUES } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import {
  CONDITION_METRICS,
  CONDITION_METRIC_REGIONS,
  CONDITION_OPERATORS,
  conditionMetricLabel,
  conditionSentence,
  isSkinTypeMetric,
  type ConditionOperator,
} from "@/lib/condition-labels";
import { youcamRegionLabel, youcamSkinTypeLabel } from "@/lib/youcam-metric-labels";

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring disabled:opacity-50";

export interface ConditionRowValues {
  metricType: string;
  region?: string;
  operator: ConditionOperator;
  value?: string;
  textValue?: string;
}

export function defaultConditionRow(metricType: string = CONDITION_METRICS[0]): ConditionRowValues {
  return { metricType, region: "", operator: "lte", value: "", textValue: "" };
}

/**
 * Una fila del bloque "Condiciones" de TreatmentForm/RoutineForm — extraído
 * porque ambos formularios son casi idénticos acá (mismo shape de condición,
 * mismo motor de matching por detrás). Métrica + (si tiene sub-regiones)
 * región + valor: numérico para casi todo, categórico (selector de tipo de
 * piel, sin operador) para `hd_skin_type`.
 */
export function ConditionRow({
  index,
  register,
  watched,
  error,
  subjectPhrase,
  onRemove,
}: {
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any> | UseFormRegister<FieldValues>;
  watched?: ConditionRowValues;
  error?: string;
  subjectPhrase: string;
  onRemove: () => void;
}) {
  const metricType = watched?.metricType ?? CONDITION_METRICS[0];
  const regions = CONDITION_METRIC_REGIONS[metricType];
  const skinType = isSkinTypeMetric(metricType);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select className={inputCls} {...register(`conditions.${index}.metricType`)}>
          {CONDITION_METRICS.map((type) => (
            <option key={type} value={type}>
              {conditionMetricLabel(type)}
            </option>
          ))}
        </select>

        {regions ? (
          <select className={inputCls} {...register(`conditions.${index}.region`)}>
            {regions.map((region) => (
              <option key={region} value={region}>
                {youcamRegionLabel(region)}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Eliminar condición</span>
        </Button>
      </div>

      {skinType ? (
        <select className={inputCls} {...register(`conditions.${index}.textValue`)}>
          {YOUCAM_SKIN_TYPE_VALUES.map((value) => (
            <option key={value} value={value}>
              {youcamSkinTypeLabel(value)}
            </option>
          ))}
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <select className={inputCls} {...register(`conditions.${index}.operator`)}>
            {CONDITION_OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.symbol} {op.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            className={inputCls}
            placeholder="Ej: 70"
            {...register(`conditions.${index}.value`)}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {watched && !error && (skinType ? watched.textValue : watched.value) && (
        <p className="text-xs text-muted-foreground">
          {conditionSentence(
            {
              metricType: watched.metricType,
              region: watched.region || null,
              operator: skinType ? "eq" : watched.operator,
              value: skinType ? null : parseFloat(watched.value ?? "") || 0,
              textValue: watched.textValue,
            },
            subjectPhrase,
          )}
        </p>
      )}
    </div>
  );
}
