"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import {
  ROUTINE_CONDITION_METRICS,
  ROUTINE_CONDITION_OPERATORS,
  routineConditionSentence,
  routineMetricLabel,
} from "@/lib/routine-labels";
import type { CreateRoutineInput, Routine } from "@/lib/queries/routines";

const conditionSchema = z.object({
  metricType: z.string().min(1, "Selecciona una métrica"),
  operator: z.enum(["lt", "lte", "eq", "gte", "gt"]),
  value: z
    .string()
    .min(1, "Requerido")
    .refine((v) => !Number.isNaN(parseFloat(v)), "Ingresa un número"),
});

const schema = z.object({
  name: z.string().min(1, "Requerido").max(200),
  description: z.string().optional(),
  isActive: z.boolean(),
  conditions: z.array(conditionSchema),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring disabled:opacity-50";

export function RoutineForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Routine;
  onSubmit: (input: CreateRoutineInput) => Promise<unknown>;
  submitLabel: string;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      isActive: defaultValues?.isActive ?? true,
      conditions:
        defaultValues?.conditions.map((c) => ({
          metricType: c.metricType,
          operator: c.operator,
          value: String(c.value),
        })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "conditions" });
  const watchedConditions = watch("conditions");

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({
        name: values.name,
        description: values.description || undefined,
        isActive: values.isActive,
        conditions: values.conditions.map((c) => ({
          metricType: c.metricType,
          operator: c.operator,
          value: parseFloat(c.value),
        })),
      });
    } catch (err) {
      setError("root", {
        message: err instanceof ApiError ? err.message : "No se pudo guardar la rutina.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          Nombre de la rutina
        </label>
        <input
          id="name"
          className={inputCls}
          placeholder="Ej: Rutina anti-arrugas nocturna"
          {...register("name")}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium text-foreground">
          Descripción <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="description"
          rows={2}
          className={inputCls}
          placeholder="Para quién es esta rutina, qué busca mejorar..."
          {...register("description")}
        />
      </div>

      <div className="flex items-center gap-2">
        <input id="isActive" type="checkbox" {...register("isActive")} />
        <label htmlFor="isActive" className="text-sm text-foreground">
          Rutina activa (se tiene en cuenta para recomendaciones)
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Condiciones</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ metricType: ROUTINE_CONDITION_METRICS[0], operator: "lte", value: "" })
            }
          >
            <Plus className="mr-1 size-4" />
            Agregar condición
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sin condiciones: esta rutina nunca se recomendará automáticamente. Agrega al
            menos una para activarla según los puntajes del análisis.
          </p>
        )}

        {fields.length > 1 && (
          <p className="text-xs text-muted-foreground">
            Basta con que se cumpla <strong>una</strong> de estas condiciones para que la
            rutina se recomiende.
          </p>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="space-y-2 rounded-lg border border-border bg-card p-3">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
              <select className={inputCls} {...register(`conditions.${index}.metricType`)}>
                {ROUTINE_CONDITION_METRICS.map((type) => (
                  <option key={type} value={type}>
                    {routineMetricLabel(type)}
                  </option>
                ))}
              </select>
              <select className={inputCls} {...register(`conditions.${index}.operator`)}>
                {ROUTINE_CONDITION_OPERATORS.map((op) => (
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
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Eliminar condición</span>
              </Button>
            </div>
            {errors.conditions?.[index] && (
              <p className="text-sm text-destructive">
                {errors.conditions[index]?.value?.message ??
                  errors.conditions[index]?.metricType?.message}
              </p>
            )}
            {watchedConditions[index]?.value && !errors.conditions?.[index] && (
              <p className="text-xs text-muted-foreground">
                {routineConditionSentence({
                  metricType: watchedConditions[index].metricType,
                  operator: watchedConditions[index].operator,
                  value: parseFloat(watchedConditions[index].value) || 0,
                })}
              </p>
            )}
          </div>
        ))}
      </div>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
