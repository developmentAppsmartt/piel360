"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { ConditionRow, defaultConditionRow } from "@/components/conditions/condition-row";
import { isSkinTypeMetric } from "@/lib/condition-labels";
import type { CreateRoutineInput, Routine } from "@/lib/queries/routines";

const conditionSchema = z
  .object({
    metricType: z.string().min(1, "Selecciona una métrica"),
    region: z.string().optional(),
    operator: z.enum(["lt", "lte", "eq", "gte", "gt", "between"]),
    value: z.string().optional(),
    valueTo: z.string().optional(),
    textValue: z.string().optional(),
  })
  .refine(
    (c) => {
      if (isSkinTypeMetric(c.metricType)) return !!c.textValue;
      if (!c.value || Number.isNaN(parseFloat(c.value))) return false;
      if (c.operator === "between") {
        return !!c.valueTo && !Number.isNaN(parseFloat(c.valueTo));
      }
      return true;
    },
    {
      message: "Selecciona un valor",
      path: ["value"],
    },
  );

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
          region: c.region ?? "",
          operator: c.operator,
          value: c.value != null ? String(c.value) : "",
          valueTo: c.valueTo != null ? String(c.valueTo) : "",
          textValue: c.textValue ?? "",
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
        conditions: values.conditions.map((c) =>
          isSkinTypeMetric(c.metricType)
            ? {
                metricType: c.metricType,
                region: c.region || undefined,
                operator: "eq" as const,
                value: null,
                textValue: c.textValue,
              }
            : {
                metricType: c.metricType,
                region: c.region || undefined,
                operator: c.operator,
                value: parseFloat(c.value ?? ""),
                valueTo: c.operator === "between" ? parseFloat(c.valueTo ?? "") : undefined,
              },
        ),
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
            onClick={() => append(defaultConditionRow())}
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
          <ConditionRow
            key={field.id}
            index={index}
            register={register}
            watched={watchedConditions[index]}
            error={
              errors.conditions?.[index]?.value?.message ??
              errors.conditions?.[index]?.metricType?.message
            }
            subjectPhrase="esta rutina"
            onRemove={() => remove(index)}
          />
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
