"use client";

import { CheckCircle2, Clock3, Filter, LayoutGrid, XCircle, type LucideIcon } from "lucide-react";
import { ANALYSIS_KIND_META } from "@/components/analyses/analysis-kind-chip";
import type { AnalysisListItem } from "@/lib/queries/analyses";
import { analysisKind, type AnalysisKind } from "@/lib/patient-comparison";
import { cn } from "@/lib/utils";

export type StatusFilter = "all" | "pending" | "confirmed" | "invalid";
export type KindFilter = "all" | AnalysisKind;

export function matchesStatus(a: AnalysisListItem, status: StatusFilter): boolean {
  if (status === "pending") return a.isValid && !a.isConfirmed;
  if (status === "confirmed") return a.isConfirmed;
  if (status === "invalid") return !a.isValid;
  return true;
}

export function matchesKind(a: AnalysisListItem, kind: KindFilter): boolean {
  return kind === "all" || analysisKind(a) === kind;
}

const STATUS_TABS: { id: StatusFilter; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "Todos", icon: LayoutGrid },
  { id: "pending", label: "Pendientes", icon: Clock3 },
  { id: "confirmed", label: "Confirmados", icon: CheckCircle2 },
  { id: "invalid", label: "Inválidos", icon: XCircle },
];

const KIND_CHIPS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  ...(Object.keys(ANALYSIS_KIND_META) as AnalysisKind[]).map((k) => ({
    id: k,
    label: ANALYSIS_KIND_META[k].label,
  })),
];

/** Estado (pestañas) y tipo de análisis (chips): se combinan. */
export function AnalysesHubFilters({
  status,
  onStatus,
  kind,
  onKind,
}: {
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  kind: KindFilter;
  onKind: (k: KindFilter) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Estado">
        {STATUS_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={status === id}
            onClick={() => onStatus(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
              status === id
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:bg-muted/60",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tipo de análisis">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Filter className="size-4" aria-hidden />
          Tipo de análisis:
        </span>
        {KIND_CHIPS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={kind === id}
            onClick={() => onKind(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              kind === id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
