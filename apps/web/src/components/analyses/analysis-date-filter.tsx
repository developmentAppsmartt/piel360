"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, Filter, X } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { colombiaDateKey } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import {
  analysisDateFilterLabel,
  type AnalysisDateFilter,
  type AnalysisDateMode,
} from "@/lib/analysis-date-filter";
import { cn } from "@/lib/utils";

const MODES: { mode: AnalysisDateMode; label: string }[] = [
  { mode: "day", label: "Día" },
  { mode: "month", label: "Mes" },
  { mode: "range", label: "Periodo personalizado" },
];

type Draft = { mode: AnalysisDateMode; day: string; month: string; from: string; to: string };

function draftFrom(filter: AnalysisDateFilter | null): Draft {
  const today = colombiaDateKey(new Date());
  const draft: Draft = {
    mode: filter?.mode ?? "day",
    day: today,
    month: today.slice(0, 7),
    from: "",
    to: "",
  };
  if (filter?.mode === "day") draft.day = filter.day;
  if (filter?.mode === "month") draft.month = filter.month;
  if (filter?.mode === "range") Object.assign(draft, { from: filter.from, to: filter.to });
  return draft;
}

function toFilter(draft: Draft): AnalysisDateFilter | null {
  if (draft.mode === "day") return draft.day ? { mode: "day", day: draft.day } : null;
  if (draft.mode === "month")
    return draft.month ? { mode: "month", month: draft.month } : null;
  return draft.from && draft.to ? { mode: "range", from: draft.from, to: draft.to } : null;
}

const dateInputClass =
  "min-w-0 flex-1 bg-transparent text-sm tabular-nums text-foreground outline-none";

/** Desplegable «Filtrar por fecha»: el borrador solo se aplica al pulsar «Aplicar». */
export function AnalysisDateFilterButton({
  value,
  onChange,
}: {
  value: AnalysisDateFilter | null;
  onChange: (filter: AnalysisDateFilter | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(value));
  const ready = toFilter(draft) !== null;

  function changeOpen(next: boolean) {
    // Al abrir se parte de lo aplicado, no de lo que quedó a medio escribir.
    if (next) setDraft(draftFrom(value));
    setOpen(next);
  }

  function apply(filter: AnalysisDateFilter | null) {
    onChange(filter);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger
        className={cn(
          "flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium",
          value
            ? "border-primary bg-primary/5 text-primary"
            : "border-input bg-background text-foreground",
        )}
      >
        <CalendarDays className="size-4" aria-hidden />
        {analysisDateFilterLabel(value)}
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end" className="z-50">
          <Popover.Popup className="w-[min(20rem,calc(100vw-2rem))] space-y-1 rounded-2xl border border-border bg-card p-2 shadow-xl outline-none">
            <Popover.Title className="sr-only">Filtrar por fecha</Popover.Title>
            {MODES.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                aria-pressed={draft.mode === mode}
                onClick={() => setDraft((d) => ({ ...d, mode }))}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                  draft.mode === mode
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <CalendarDays className="size-4" aria-hidden />
                {label}
              </button>
            ))}

            <div className="flex h-10 items-center gap-2 rounded-lg border border-border px-3">
              {draft.mode === "day" ? (
                <input
                  type="date"
                  aria-label="Día"
                  value={draft.day}
                  onChange={(e) => setDraft((d) => ({ ...d, day: e.target.value }))}
                  className={dateInputClass}
                />
              ) : draft.mode === "month" ? (
                <input
                  type="month"
                  aria-label="Mes"
                  value={draft.month}
                  onChange={(e) => setDraft((d) => ({ ...d, month: e.target.value }))}
                  className={dateInputClass}
                />
              ) : (
                <>
                  <input
                    type="date"
                    aria-label="Desde"
                    value={draft.from}
                    max={draft.to || undefined}
                    onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                    className={dateInputClass}
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="date"
                    aria-label="Hasta"
                    value={draft.to}
                    min={draft.from || undefined}
                    onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                    className={dateInputClass}
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {value ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => apply(null)}>
                  <X className="size-4" aria-hidden />
                  Quitar filtro
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="button"
                size="sm"
                disabled={!ready || (draft.mode === "range" && draft.from > draft.to)}
                onClick={() => apply(toFilter(draft))}
              >
                <Filter className="size-4" aria-hidden />
                Aplicar
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
