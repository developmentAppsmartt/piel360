"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { GatewayConfigSafe } from "@piel360/shared";
import { CreditCard, Pencil, Plus, ShieldCheck, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { useGatewayConfigs } from "@/lib/queries/gateway-configs";
import { cn } from "@/lib/utils";

function SecretChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        ok ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500",
      )}
    >
      {label}
    </span>
  );
}

function EnvBadge({ environment }: { environment: string }) {
  const isProd = environment === "production";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        isProd ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-800",
      )}
    >
      {isProd ? "Producción" : "Sandbox"}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      Activa
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
      Inactiva
    </span>
  );
}

export default function GatewayConfigsPage() {
  const configs = useGatewayConfigs();
  const rows = configs.data ?? [];

  const stats = useMemo(() => {
    const active = rows.filter((c) => c.isActive);
    const primary = active[0] ?? rows[0] ?? null;
    return {
      total: rows.length,
      active: active.length,
      feePercent: primary?.feePercent ?? null,
      payoutsConfigured: primary?.payoutsConfigured === true,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pasarelas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Wompi para cobros y Pagos a Terceros para dispersar comisiones a
            todas las empresas aliadas referidas.
          </p>
        </div>
        <Link
          href="/admin/gateway-configs/nuevo"
          className={buttonVariants({ variant: "default" })}
        >
          <Plus className="size-4" />
          Nueva pasarela
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Configuraciones</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.total}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Activas</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
            {stats.active}
          </p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Comisión pasarela</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {stats.feePercent != null ? `${stats.feePercent}%` : "—"}
          </p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Payouts</p>
          <p
            className={cn(
              "mt-1 text-lg font-semibold",
              stats.payoutsConfigured ? "text-emerald-700" : "text-amber-700",
            )}
          >
            {stats.payoutsConfigured ? "Configurado" : "Pendiente"}
          </p>
        </ModuleCard>
      </div>

      <ModuleCard className="overflow-hidden p-0">
        <div className="border-b border-border p-5">
          <ModuleCardTitle>Lista de pasarelas</ModuleCardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Edita en página completa: checkout, payouts y beneficiarios referidos.
          </p>
        </div>

        {configs.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando pasarelas…</p>
        ) : configs.isError ? (
          <p className="p-5 text-sm text-destructive">
            No se pudo cargar la configuración de pasarelas.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Aún no hay pasarelas.{" "}
            <Link href="/admin/gateway-configs/nuevo" className="text-primary underline">
              Crear la de Wompi
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Pasarela</th>
                  <th className="px-4 py-3 font-semibold">Entorno</th>
                  <th className="px-4 py-3 font-semibold">Public key</th>
                  <th className="px-4 py-3 font-semibold">Checkout</th>
                  <th className="px-4 py-3 font-semibold">Payouts</th>
                  <th className="px-4 py-3 font-semibold">Fee</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((config: GatewayConfigSafe) => (
                  <tr key={config.id} className="border-t border-border/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <CreditCard className="size-4" aria-hidden />
                        </span>
                        <div>
                          <p className="font-medium capitalize text-foreground">
                            {config.gatewayName}
                          </p>
                          <p className="text-xs text-muted-foreground">ID {config.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <EnvBadge environment={config.environment} />
                    </td>
                    <td className="px-4 py-3">
                      <code className="block max-w-56 truncate font-mono text-xs text-muted-foreground">
                        {config.publicKey}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <SecretChip ok={config.hasPrivateKey} label="Private" />
                        <SecretChip ok={config.hasIntegritySecret} label="Integridad" />
                        <SecretChip ok={config.hasWebhookSecret} label="Webhook" />
                      </div>
                      {config.secretsReadable === false ? (
                        <p className="mt-1 text-[11px] text-amber-700">
                          Re-guarda secretos (ENCRYPTION_KEY)
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <SecretChip ok={Boolean(config.hasPayoutApiKey)} label="API key" />
                        <SecretChip
                          ok={Boolean(config.hasPayoutUserPrincipalId)}
                          label="User id"
                        />
                        <SecretChip ok={Boolean(config.payoutAccountId)} label="Account" />
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {config.feePercent != null ? `${config.feePercent}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={config.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Link
                          href={`/admin/gateway-configs/${config.id}/editar`}
                          className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                          aria-label={`Editar pasarela ${config.gatewayName}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModuleCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleCard className="flex items-start gap-3 bg-muted/20 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Checkout y webhooks</p>
            <p className="mt-1">
              Activan el cobro de planes. Webhook:{" "}
              <code className="font-mono text-xs">/webhooks/wompi</code>.
            </p>
          </div>
        </ModuleCard>
        <ModuleCard className="flex items-start gap-3 bg-muted/20 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Wallet className="size-4" aria-hidden />
          </span>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Pagos a Terceros</p>
            <p className="mt-1">
              Una sola cuenta origen paga a muchas aliadas (referidos) en un lote
              mensual o desde Facturación.
            </p>
          </div>
        </ModuleCard>
      </div>
    </div>
  );
}
