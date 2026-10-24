"use client";

import { useState } from "react";
import { CalendarDays, Filter } from "lucide-react";
import { colombiaDateKey } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import type { BillingFilters, PlanSaleType } from "@/lib/queries/admin-billing";
import { PLAN_TYPE_META } from "./billing-labels";

type Period = "last30" | "thisMonth" | "lastMonth" | "custom";

const PERIOD_LABELS: Record<Period, string> = {
  last30: "Últimos 30 días",
  thisMonth: "Este mes",
  lastMonth: "Mes anterior",
  custom: "Personalizado",
};

const DAY_MS = 86_400_000;

/** Fechas en días de Colombia, igual que el API. */
function periodRange(period: Exclude<Period, "custom">): {
  from: string;
  to: string;
} {
  const today = colombiaDateKey(new Date());
  if (period === "last30") {
    return {
      from: colombiaDateKey(new Date(Date.now() - 29 * DAY_MS)),
      to: today,
    };
  }
  const [y, m] = today.split("-").map(Number);
  if (period === "thisMonth")
    return { from: `${today.slice(0, 7)}-01`, to: today };
  const prev = new Date(Date.UTC(y, m - 2, 1));
  const last = new Date(Date.UTC(y, m - 1, 0));
  return {
    from: prev.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
}

export function defaultBillingFilters(): BillingFilters {
  return { ...periodRange("last30"), planType: "all" };
}

const selectClass =
  "h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none";

/** El formulario vive en estado local: solo cambia la consulta al pulsar «Aplicar filtros». */
export function BillingFiltersBar({
  onApply,
  isFetching,
}: {
  onApply: (filters: BillingFilters) => void;
  isFetching: boolean;
}) {
  const [draft, setDraft] = useState<BillingFilters>(defaultBillingFilters);
  const [period, setPeriod] = useState<Period>("last30");

  function choosePeriod(next: Period) {
    setPeriod(next);
    if (next !== "custom") setDraft((d) => ({ ...d, ...periodRange(next) }));
  }

  function setDate(key: "from" | "to", value: string) {
    if (!value) return;
    setPeriod("custom");
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (next.from > next.to)
        return key === "from"
          ? { ...next, to: value }
          : { ...next, from: value };
      return next;
    });
  }

  return (
    <ModuleCard className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] md:items-end">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Tipo de plan
        </span>
        <select
          value={draft.planType}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              planType: e.target.value as PlanSaleType | "all",
            }))
          }
          className={selectClass}
        >
          <option value="all">Todos</option>
          {(Object.keys(PLAN_TYPE_META) as PlanSaleType[]).map((type) => (
            <option key={type} value={type}>
              {PLAN_TYPE_META[type].short}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Periodo
        </span>
        <select
          value={period}
          onChange={(e) => choosePeriod(e.target.value as Period)}
          className={selectClass}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((key) => (
            <option key={key} value={key}>
              {PERIOD_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm">
        <CalendarDays
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <input
          type="date"
          value={draft.from}
          max={draft.to}
          onChange={(e) => setDate("from", e.target.value)}
          aria-label="Desde"
          className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
        />
        <span className="text-muted-foreground">—</span>
        <input
          type="date"
          value={draft.to}
          onChange={(e) => setDate("to", e.target.value)}
          aria-label="Hasta"
          className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
        />
      </div>

      <Button
        type="button"
        className="h-9 gap-2"
        onClick={() => onApply(draft)}
        disabled={isFetching}
      >
        <Filter className="size-4" aria-hidden />
        {isFetching ? "Aplicando…" : "Aplicar filtros"}
      </Button>
    </ModuleCard>
  );
}
