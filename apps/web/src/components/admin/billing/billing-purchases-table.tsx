"use client";

import { useMemo, useState } from "react";
import { AdminSearchInput } from "@/components/admin/admin-directory-ui";
import { formatCOP } from "@/components/payments/subscription-utils";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import type { BillingPurchase } from "@/lib/queries/admin-billing";
import { cn } from "@/lib/utils";
import {
  PLAN_TYPE_META,
  PURCHASE_STATUS_META,
  SALE_TYPE_TABS,
  type SaleTypeTab,
} from "./billing-labels";

const dateFormat = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

function matches(row: BillingPurchase, tab: SaleTypeTab, needle: string) {
  if (tab === "referred" && !row.isReferredSale) return false;
  if (tab === "common" && row.isReferredSale) return false;
  if (!needle) return true;
  return [
    row.user.name,
    row.user.email,
    row.plan.name,
    row.organization?.name,
    row.invoice?.wompiTransactionId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

/** Compras de la más reciente a la más antigua (el API ya las ordena). */
export function BillingPurchasesTable({
  purchases,
  onSelect,
}: {
  purchases: BillingPurchase[];
  onSelect: (purchase: BillingPurchase) => void;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<SaleTypeTab>("all");

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return purchases.filter((row) => matches(row, tab, needle));
  }, [purchases, search, tab]);

  const totals = useMemo(
    () => ({
      credits: rows.reduce((sum, r) => sum + r.credits, 0),
      amount: rows.reduce((sum, r) => sum + r.amount, 0),
    }),
    [rows],
  );

  return (
    <ModuleCard className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <ModuleCardTitle className="mr-auto">
          Compras por tipo de plan
        </ModuleCardTitle>
        <div
          className="inline-flex gap-1 rounded-full bg-muted p-1"
          role="tablist"
          aria-label="Tipo de venta"
        >
          {SALE_TYPE_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                tab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar factura…"
          className="sm:w-64"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-220 text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Usuario / empresa</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Tipo de análisis</th>
              <th className="px-4 py-3 text-right font-medium">Créditos</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No hay compras con estos filtros.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const type = PLAN_TYPE_META[row.planType];
                const status = PURCHASE_STATUS_META[row.status];
                return (
                  <tr
                    key={row.id}
                    onClick={row.invoice ? () => onSelect(row) : undefined}
                    className={cn(
                      "border-t border-border/80",
                      row.invoice && "cursor-pointer hover:bg-muted/30",
                    )}
                    title={
                      row.invoice ? "Ver desglose de la factura" : undefined
                    }
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          type.pill,
                        )}
                      >
                        {type.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {dateFormat.format(new Date(row.date))}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">
                        {row.user.name}
                      </p>
                      {/* La factura trae la empresa también en ventas comunes:
                          «Referida» solo si lo es. */}
                      {row.organization ? (
                        <p
                          className={cn(
                            "text-xs",
                            row.isReferredSale
                              ? "text-sky-700"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.isReferredSale ? "Referida · " : ""}
                          {row.organization.name}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">{row.plan.name}</td>
                    <td className="px-4 py-2.5">{type.short}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.credits}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatCOP(row.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
                          status.pill,
                        )}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {rows.length > 0 ? (
            <tfoot>
              <tr className="border-t border-border bg-muted/40 font-semibold">
                <td className="px-4 py-3" colSpan={5}>
                  Total · {rows.length}{" "}
                  {rows.length === 1 ? "compra" : "compras"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {totals.credits}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCOP(totals.amount)}
                </td>
                <td />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </ModuleCard>
  );
}
