"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiClientFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-error";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { AdminSearchInput } from "@/components/admin/admin-directory-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BillingInvoice = {
  id: string;
  isReferredSale: boolean;
  grossAmount: number;
  gatewayFeeAmount: number;
  gatewayFeePercent: number;
  netAfterGateway: number;
  operationalCostAmount: number;
  operationalCostPercent?: number;
  apiTokenCostAmount?: number;
  ivaAmount?: number;
  commissionBaseAmount: number;
  alliedCommissionPercent: number | null;
  alliedCommissionAmount: number;
  platformNetAmount: number;
  alliedPayoutStatus: "none" | "pending" | "processing" | "dispersed";
  currency: string;
  wompiTransactionId: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  plan: { id: string; name: string };
  organization: { id: string; name: string } | null;
};

type BillingDashboard = {
  metrics: {
    invoiceCount: number;
    grossTotal: number;
    gatewayFeesTotal: number;
    platformNetTotal: number;
    alliedCommissionsTotal: number;
    alliedPendingTotal: number;
    alliedDispersedTotal: number;
    referredSalesCount: number;
    commonSalesCount: number;
  };
  byPlan: Array<{
    planId: string;
    planName: string;
    salesCount: number;
    grossTotal: number;
    platformNetTotal: number;
    alliedCommissionTotal: number;
    referredSalesCount: number;
  }>;
  invoices: BillingInvoice[];
};

type SaleFilter = "all" | "referred" | "common";

function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function BillingDashboard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "billing"],
    queryFn: () => apiClientFetch<BillingDashboard>("/admin/billing"),
  });
  const [search, setSearch] = useState("");
  const [saleFilter, setSaleFilter] = useState<SaleFilter>("all");
  const [disperseMsg, setDisperseMsg] = useState<string | null>(null);

  const disperseAll = useMutation({
    mutationFn: () =>
      apiClientFetch<{
        beneficiaryCount: number;
        totalAmount: number;
        status?: string;
        reference?: string | null;
        wompiPayoutId?: string | null;
        skipped?: Array<{ name?: string; reason?: string }>;
      }>("/admin/billing/allied/disperse-all", { method: "POST" }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ["admin", "billing"] });
      void qc.invalidateQueries({
        queryKey: ["admin", "organizations", "allied"],
      });
      if (result.beneficiaryCount === 0) {
        setDisperseMsg("No había aliadas listas con comisiones pendientes.");
        return;
      }
      setDisperseMsg(
        `Lote multi-beneficiario enviado: ${result.beneficiaryCount} aliadas · ${formatCop(result.totalAmount)} · ${result.status ?? "processing"}${
          result.wompiPayoutId ? ` · id ${result.wompiPayoutId}` : ""
        }`,
      );
    },
    onError: (err) => {
      setDisperseMsg(
        err instanceof ApiError
          ? err.message
          : "No se pudo dispersar el lote multi-beneficiario.",
      );
    },
  });

  const filtered = useMemo(() => {
    const rows = query.data?.invoices ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (saleFilter === "referred" && !row.isReferredSale) return false;
      if (saleFilter === "common" && row.isReferredSale) return false;
      if (!q) return true;
      const haystack = [
        row.user.name,
        row.user.email,
        row.plan.name,
        row.organization?.name,
        row.wompiTransactionId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query.data?.invoices, search, saleFilter]);

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando facturación…</p>;
  }
  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar el módulo de facturación.
      </p>
    );
  }

  const { metrics, byPlan } = query.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Balances de suscripciones pagadas, ingresos netos de la plataforma y
            control de ventas referidas vs comunes. La comisión aliada se calcula
            sobre el neto tras descontar el % de la pasarela.
          </p>
        </div>
        <Button
          type="button"
          disabled={disperseAll.isPending || metrics.alliedPendingTotal <= 0}
          onClick={() => {
            if (
              !window.confirm(
                `¿Enviar un lote Wompi con un pago por cada empresa aliada pendiente (total ${formatCop(metrics.alliedPendingTotal)})?`,
              )
            ) {
              return;
            }
            setDisperseMsg(null);
            disperseAll.mutate();
          }}
        >
          {disperseAll.isPending
            ? "Enviando lote…"
            : "Dispersar todas (lote multi)"}
        </Button>
      </div>

      {disperseMsg ? (
        <p
          className={cn(
            "text-sm",
            disperseAll.isError ? "text-destructive" : "text-emerald-700",
          )}
        >
          {disperseMsg}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ingreso bruto" value={formatCop(metrics.grossTotal)} />
        <MetricCard
          label="Neto plataforma"
          value={formatCop(metrics.platformNetTotal)}
          accent="text-emerald-600"
        />
        <MetricCard
          label="Fees pasarela"
          value={formatCop(metrics.gatewayFeesTotal)}
        />
        <MetricCard
          label="Comisiones aliados"
          value={formatCop(metrics.alliedCommissionsTotal)}
          accent="text-amber-600"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Facturas" value={String(metrics.invoiceCount)} />
        <MetricCard
          label="Ventas comunes"
          value={String(metrics.commonSalesCount)}
        />
        <MetricCard
          label="Ventas referidas"
          value={String(metrics.referredSalesCount)}
          accent="text-sky-600"
        />
        <MetricCard
          label="Pendiente dispersar"
          value={formatCop(metrics.alliedPendingTotal)}
          accent="text-amber-600"
        />
      </div>

      <ModuleCard className="overflow-hidden p-0">
        <div className="border-b border-border p-5">
          <ModuleCardTitle>Ingresos por plan</ModuleCardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Ventas</th>
                <th className="px-4 py-3 font-semibold">Referidas</th>
                <th className="px-4 py-3 font-semibold">Bruto</th>
                <th className="px-4 py-3 font-semibold">Neto plataforma</th>
                <th className="px-4 py-3 font-semibold">Comisión aliados</th>
              </tr>
            </thead>
            <tbody>
              {byPlan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Aún no hay ventas registradas. Se crean al activar un pago Wompi.
                  </td>
                </tr>
              ) : (
                byPlan.map((row) => (
                  <tr key={row.planId} className="border-t border-border/80">
                    <td className="px-4 py-3 font-medium">{row.planName}</td>
                    <td className="px-4 py-3 tabular-nums">{row.salesCount}</td>
                    <td className="px-4 py-3 tabular-nums">{row.referredSalesCount}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCop(row.grossTotal)}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-700">
                      {formatCop(row.platformNetTotal)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-amber-700">
                      {formatCop(row.alliedCommissionTotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ModuleCard>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all" as const, label: "Todas" },
            { id: "common" as const, label: "Comunes" },
            { id: "referred" as const, label: "Referidas" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              saleFilter === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setSaleFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
        <div className="ml-auto w-full sm:w-72">
          <AdminSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar factura…"
          />
        </div>
      </div>

      <ModuleCard className="overflow-hidden p-0">
        <div className="border-b border-border p-5">
          <ModuleCardTitle>Facturas de suscripción</ModuleCardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-220 text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Bruto</th>
                <th className="px-4 py-3 font-semibold">Fee</th>
                <th className="px-4 py-3 font-semibold">Gastos</th>
                <th className="px-4 py-3 font-semibold">Aliado</th>
                <th className="px-4 py-3 font-semibold">Neto Piel360</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No hay facturas en este filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="border-t border-border/80">
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{inv.user.name}</p>
                      <p className="text-xs text-muted-foreground">{inv.user.email}</p>
                    </td>
                    <td className="px-4 py-3">{inv.plan.name}</td>
                    <td className="px-4 py-3">
                      {inv.isReferredSale ? (
                        <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                          Referida
                          {inv.organization ? ` · ${inv.organization.name}` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                          Común
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCop(inv.grossAmount)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {formatCop(inv.gatewayFeeAmount)}
                      <span className="block text-[11px]">{inv.gatewayFeePercent}%</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {formatCop(inv.operationalCostAmount ?? 0)}
                      {inv.operationalCostPercent != null &&
                      inv.operationalCostPercent > 0 ? (
                        <span className="block text-[11px]">
                          Op. {inv.operationalCostPercent}%
                        </span>
                      ) : null}
                      {(inv.apiTokenCostAmount ?? 0) > 0 ? (
                        <span className="block text-[11px]">
                          API {formatCop(inv.apiTokenCostAmount ?? 0)}
                        </span>
                      ) : null}
                      <span className="block text-[11px]">
                        Base {formatCop(inv.commissionBaseAmount ?? inv.netAfterGateway)}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {inv.isReferredSale ? (
                        <>
                          {formatCop(inv.alliedCommissionAmount)}
                          <span className="block text-[11px] text-muted-foreground">
                            {inv.alliedCommissionPercent}% ·{" "}
                            {inv.alliedPayoutStatus === "dispersed"
                              ? "dispersada"
                              : inv.alliedPayoutStatus === "processing"
                                ? "en proceso Wompi"
                                : inv.alliedPayoutStatus === "pending"
                                  ? "pendiente"
                                  : "—"}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-emerald-700">
                      {formatCop(inv.platformNetAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ModuleCard>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <ModuleCard className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", accent)}>{value}</p>
    </ModuleCard>
  );
}
