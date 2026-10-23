"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatCOP } from "@/components/payments/subscription-utils";
import { Button } from "@/components/ui/button";
import { apiClientFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-error";
import {
  ADMIN_BILLING_KEY,
  useAdminBilling,
  type BillingFilters,
  type BillingPurchase,
} from "@/lib/queries/admin-billing";
import { cn } from "@/lib/utils";
import { BillingFiltersBar, defaultBillingFilters } from "./billing-filters";
import { BillingGoals } from "./billing-goals";
import { BillingInvoiceDialog } from "./billing-invoice-dialog";
import { BillingPurchasesTable } from "./billing-purchases-table";
import { BillingTotals } from "./billing-totals";
import { BillingTypeCards } from "./billing-type-cards";

type DisperseResult = {
  beneficiaryCount: number;
  totalAmount: number;
  status?: string;
  wompiPayoutId?: string | null;
};

function useDisperseAll(onMessage: (msg: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClientFetch<DisperseResult>("/admin/billing/allied/disperse-all", {
        method: "POST",
      }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ADMIN_BILLING_KEY });
      void qc.invalidateQueries({
        queryKey: ["admin", "organizations", "allied"],
      });
      onMessage(
        result.beneficiaryCount === 0
          ? "No había aliadas listas con comisiones pendientes."
          : `Lote multi-beneficiario enviado: ${result.beneficiaryCount} aliadas · ${formatCOP(result.totalAmount)} · ${result.status ?? "processing"}${
              result.wompiPayoutId ? ` · id ${result.wompiPayoutId}` : ""
            }`,
      );
    },
    onError: (err) =>
      onMessage(
        err instanceof ApiError
          ? err.message
          : "No se pudo dispersar el lote multi-beneficiario.",
      ),
  });
}

export function BillingDashboard() {
  const [filters, setFilters] = useState<BillingFilters>(defaultBillingFilters);
  const [selected, setSelected] = useState<BillingPurchase | null>(null);
  const [disperseMsg, setDisperseMsg] = useState<string | null>(null);
  const query = useAdminBilling(filters);
  const disperseAll = useDisperseAll(setDisperseMsg);
  const data = query.data;
  const pendingGlobal = data?.metrics.alliedPendingGlobal ?? 0;

  function confirmDisperse() {
    if (
      !window.confirm(
        `¿Enviar un lote Wompi con un pago por cada empresa aliada pendiente (total ${formatCOP(pendingGlobal)})?`,
      )
    ) {
      return;
    }
    setDisperseMsg(null);
    disperseAll.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Facturación y metas de ventas
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Control de compras de planes, ingresos y cumplimiento comercial.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={disperseAll.isPending || pendingGlobal <= 0}
          onClick={confirmDisperse}
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

      <BillingFiltersBar onApply={setFilters} isFetching={query.isFetching} />

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando facturación…</p>
      ) : query.isError || !data ? (
        <p className="text-sm text-destructive">
          No se pudo cargar el módulo de facturación.
        </p>
      ) : (
        <>
          <BillingTotals metrics={data.metrics} />
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Compras por tipo de plan
            </h2>
            <BillingTypeCards byType={data.byType} />
            <BillingPurchasesTable
              purchases={data.purchases}
              onSelect={setSelected}
            />
          </section>
          <BillingGoals goals={data.goals} />
        </>
      )}

      <BillingInvoiceDialog
        purchase={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
