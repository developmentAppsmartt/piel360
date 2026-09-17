"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { GatewayConfigSafe } from "@piel360/shared";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";

const gatewayConfigSchema = z.object({
  gatewayName: z.string().min(1, "Requerido"),
  environment: z.enum(["sandbox", "production"]),
  publicKey: z.string().min(1, "Requerido"),
  privateKey: z.string(),
  integritySecret: z.string(),
  webhookSecret: z.string(),
  feePercent: z.number().min(0).max(100),
  payoutApiKey: z.string(),
  payoutUserPrincipalId: z.string(),
  payoutAccountId: z.string(),
  isActive: z.boolean(),
});

type GatewayConfigFormValues = z.infer<typeof gatewayConfigSchema>;

export interface GatewayConfigFormInput {
  gatewayName?: string;
  environment: "sandbox" | "production";
  publicKey: string;
  privateKey?: string;
  integritySecret?: string;
  webhookSecret?: string;
  feePercent?: number;
  payoutApiKey?: string;
  payoutUserPrincipalId?: string;
  payoutAccountId?: string;
  isActive?: boolean;
}

function toInput(values: GatewayConfigFormValues): GatewayConfigFormInput {
  return {
    gatewayName: values.gatewayName,
    environment: values.environment,
    publicKey: values.publicKey,
    privateKey: values.privateKey || undefined,
    integritySecret: values.integritySecret || undefined,
    webhookSecret: values.webhookSecret || undefined,
    feePercent: values.feePercent,
    payoutApiKey: values.payoutApiKey || undefined,
    payoutUserPrincipalId: values.payoutUserPrincipalId || undefined,
    payoutAccountId: values.payoutAccountId.trim() || undefined,
    isActive: values.isActive,
  };
}

export function GatewayConfigForm({
  defaultValues,
  onSubmit,
  submitLabel,
  onCancel,
}: {
  defaultValues?: GatewayConfigSafe;
  onSubmit: (input: GatewayConfigFormInput) => Promise<unknown>;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const mustResaveSecrets = defaultValues?.secretsReadable === false;
  const isEdit = Boolean(defaultValues);

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
      feePercent: defaultValues?.feePercent ?? 2.99,
      payoutApiKey: "",
      payoutUserPrincipalId: "",
      payoutAccountId: defaultValues?.payoutAccountId ?? "",
      isActive: defaultValues?.isActive ?? true,
    },
  });

  const submit = handleSubmit(async (values) => {
    if (mustResaveSecrets) {
      if (
        !values.privateKey.trim() ||
        !values.integritySecret.trim() ||
        !values.webhookSecret.trim()
      ) {
        setError("root", {
          message:
            "Debes volver a pegar private key, secreto de integridad y secreto de webhook. Los actuales no se pueden leer con la ENCRYPTION_KEY de este entorno.",
        });
        return;
      }
    }
    if (!isEdit && (!values.privateKey.trim() || !values.integritySecret.trim())) {
      setError("root", {
        message:
          "Private key y secreto de integridad son obligatorios al crear la pasarela.",
      });
      return;
    }

    try {
      await onSubmit(toInput(values));
    } catch (err) {
      setError("root", {
        message:
          err instanceof ApiError
            ? err.message
            : "No se pudo guardar la configuración.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      {mustResaveSecrets ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Los secretos guardados no se pueden descifrar con la{" "}
          <code className="font-mono">ENCRYPTION_KEY</code> actual. Pega de nuevo
          private key, integrity secret y webhook secret desde el dashboard de
          Wompi y guarda.
        </div>
      ) : null}

      <ModuleCard className="space-y-4 p-5">
        <div>
          <ModuleCardTitle>Checkout Wompi</ModuleCardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Llaves para cobrar planes y validar el webhook de activación.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
        {errors.publicKey ? (
          <p className="text-sm text-destructive">{errors.publicKey.message}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <TextField
              label="Comisión pasarela (%)"
              id="feePercent"
              type="number"
              step="0.01"
              min={0}
              max={100}
              {...register("feePercent", { valueAsNumber: true })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Se descuenta del bruto antes del % del aliado.
            </p>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" {...register("isActive")} className="size-4" />
            Pasarela activa
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-1">
          <TextField
            label={
              mustResaveSecrets
                ? "Private key (obligatorio — volver a pegar)"
                : defaultValues?.hasPrivateKey
                  ? "Private key (configurada — vacío = no cambiar)"
                  : "Private key"
            }
            id="privateKey"
            type="password"
            autoComplete="off"
            {...register("privateKey")}
          />
          <TextField
            label={
              mustResaveSecrets
                ? "Secreto de integridad (obligatorio — volver a pegar)"
                : defaultValues?.hasIntegritySecret
                  ? "Secreto de integridad (configurado — vacío = no cambiar)"
                  : "Secreto de integridad"
            }
            id="integritySecret"
            type="password"
            autoComplete="off"
            {...register("integritySecret")}
          />
          <TextField
            label={
              mustResaveSecrets
                ? "Secreto de eventos/webhook (obligatorio — volver a pegar)"
                : defaultValues?.hasWebhookSecret
                  ? "Secreto de eventos/webhook (configurado — vacío = no cambiar)"
                  : "Secreto de eventos/webhook"
            }
            id="webhookSecret"
            type="password"
            autoComplete="off"
            {...register("webhookSecret")}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Webhook en Wompi:{" "}
          <code className="font-mono">https://&lt;api&gt;/webhooks/wompi</code>{" "}
          (sin <code className="font-mono">/api</code>).
        </p>
      </ModuleCard>

      <ModuleCard className="space-y-4 p-5">
        <div>
          <ModuleCardTitle>Pagos a Terceros (dispersión)</ModuleCardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Credenciales distintas del checkout. Desde esta cuenta origen se
            pagan las comisiones de <strong>todas</strong> las empresas aliadas
            (referidos) en lotes multi-beneficiario.
          </p>
        </div>

        <TextField
          label={
            defaultValues?.hasPayoutApiKey
              ? "Payout API key (configurada — vacío = no cambiar)"
              : "Payout API key"
          }
          id="payoutApiKey"
          type="password"
          autoComplete="off"
          {...register("payoutApiKey")}
        />
        <TextField
          label={
            defaultValues?.hasPayoutUserPrincipalId
              ? "User principal id (configurado — vacío = no cambiar)"
              : "User principal id"
          }
          id="payoutUserPrincipalId"
          type="password"
          autoComplete="off"
          {...register("payoutUserPrincipalId")}
        />
        <TextField
          label="Cuenta origen (accountId)"
          id="payoutAccountId"
          {...register("payoutAccountId")}
        />
        {defaultValues?.payoutsConfigured ? (
          <p className="text-sm text-emerald-700">
            Payouts listo para dispersar comisiones a referidos.
          </p>
        ) : (
          <p className="text-sm text-amber-700">
            Completa las tres credenciales para habilitar la dispersión automática
            a empresas aliadas.
          </p>
        )}
      </ModuleCard>

      {errors.root ? (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
