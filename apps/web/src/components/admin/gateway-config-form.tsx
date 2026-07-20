"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { GatewayConfigSafe } from "@piel360/shared";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";

const gatewayConfigSchema = z.object({
  gatewayName: z.string().min(1, "Requerido"),
  environment: z.enum(["sandbox", "production"]),
  publicKey: z.string().min(1, "Requerido"),
  privateKey: z.string(),
  integritySecret: z.string(),
  webhookSecret: z.string(),
  isActive: z.boolean(),
});

type GatewayConfigFormValues = z.infer<typeof gatewayConfigSchema>;

interface GatewayConfigInput {
  gatewayName?: string;
  environment: "sandbox" | "production";
  publicKey: string;
  privateKey?: string;
  integritySecret?: string;
  webhookSecret?: string;
  isActive?: boolean;
}

function toInput(values: GatewayConfigFormValues): GatewayConfigInput {
  return {
    gatewayName: values.gatewayName,
    environment: values.environment,
    publicKey: values.publicKey,
    // Vacío = "no cambiar" (edición) — apps/api/src/payments/payments.service.ts
    // trata `undefined` como "dejar la columna intacta" en el PATCH.
    privateKey: values.privateKey || undefined,
    integritySecret: values.integritySecret || undefined,
    webhookSecret: values.webhookSecret || undefined,
    isActive: values.isActive,
  };
}

export function GatewayConfigForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: GatewayConfigSafe;
  onSubmit: (input: GatewayConfigInput) => Promise<unknown>;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<GatewayConfigFormValues>({
    resolver: zodResolver(gatewayConfigSchema),
    defaultValues: {
      gatewayName: defaultValues?.gatewayName ?? "wompi",
      environment: defaultValues?.environment ?? "sandbox",
      publicKey: defaultValues?.publicKey ?? "",
      privateKey: "",
      integritySecret: "",
      webhookSecret: "",
      isActive: defaultValues?.isActive ?? true,
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toInput(values));
    } catch (err) {
      setError("root", {
        message: err instanceof ApiError ? err.message : "No se pudo guardar la configuración.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Gateway" id="gatewayName" {...register("gatewayName")} />
        <div className="space-y-2">
          <label htmlFor="environment" className="text-sm font-medium">
            Entorno
          </label>
          <select
            id="environment"
            {...register("environment")}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="sandbox">Sandbox</option>
            <option value="production">Producción</option>
          </select>
        </div>
      </div>

      <TextField label="Public key" id="publicKey" {...register("publicKey")} />
      {errors.publicKey && <p className="text-sm text-destructive">{errors.publicKey.message}</p>}

      <TextField
        label={defaultValues?.hasPrivateKey ? "Private key (configurada — dejar vacío para no cambiar)" : "Private key"}
        id="privateKey"
        type="password"
        autoComplete="off"
        {...register("privateKey")}
      />
      <TextField
        label={
          defaultValues?.hasIntegritySecret
            ? "Secreto de integridad (configurado — dejar vacío para no cambiar)"
            : "Secreto de integridad"
        }
        id="integritySecret"
        type="password"
        autoComplete="off"
        {...register("integritySecret")}
      />
      <TextField
        label={
          defaultValues?.hasWebhookSecret
            ? "Secreto de eventos/webhook (configurado — dejar vacío para no cambiar)"
            : "Secreto de eventos/webhook"
        }
        id="webhookSecret"
        type="password"
        autoComplete="off"
        {...register("webhookSecret")}
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isActive")} />
        Activa
      </label>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
