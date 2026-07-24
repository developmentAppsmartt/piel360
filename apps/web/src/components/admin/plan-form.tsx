"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { useAnalysisProviders } from "@/lib/queries/plans";
import type { PlanAdmin, PlanInput } from "@/lib/queries/plans";

const planSchema = z.object({
  name: z.string().min(1, "Requerido"),
  analysisProviderId: z.string().min(1, "Requerido"),
  analysisLimit: z.number().int().min(0),
  price: z.number().min(0),
  durationDays: z.number().int().min(1),
  isActive: z.boolean(),
  description: z.string(),
});

type PlanFormValues = z.infer<typeof planSchema>;

function toInput(values: PlanFormValues): PlanInput {
  return {
    name: values.name,
    analysisProviderId: values.analysisProviderId,
    analysisLimit: values.analysisLimit,
    price: values.price,
    durationDays: values.durationDays,
    isActive: values.isActive,
    description: values.description || undefined,
  };
}

export function PlanForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: PlanAdmin;
  onSubmit: (input: PlanInput) => Promise<unknown>;
  submitLabel: string;
}) {
  const providers = useAnalysisProviders();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      analysisProviderId: defaultValues?.analysisProviderId ?? "1",
      analysisLimit: defaultValues?.analysisLimit ?? 0,
      price: defaultValues ? Number(defaultValues.price) : 0,
      durationDays: defaultValues?.durationDays ?? 30,
      isActive: defaultValues?.isActive ?? true,
      description: defaultValues?.description ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toInput(values));
    } catch (err) {
      setError("root", {
        message: err instanceof ApiError ? err.message : "No se pudo guardar el plan.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <TextField label="Nombre del plan" id="name" {...register("name")} />
      {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}

      <div className="space-y-2">
        <label htmlFor="analysisProviderId" className="text-sm font-medium">
          Proveedor de análisis
        </label>
        <select
          id="analysisProviderId"
          {...register("analysisProviderId")}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {providers.data?.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Límite de análisis"
          id="analysisLimit"
          type="number"
          {...register("analysisLimit", { valueAsNumber: true })}
        />
        <TextField
          label="Precio (COP)"
          id="price"
          type="number"
          {...register("price", { valueAsNumber: true })}
        />
      </div>

      <TextField
        label="Duración (días)"
        id="durationDays"
        type="number"
        {...register("durationDays", { valueAsNumber: true })}
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isActive")} />
        ¿Está activo?
      </label>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="description"
          {...register("description")}
          rows={3}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
