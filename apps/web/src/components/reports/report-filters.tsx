"use client";

import { useRef } from "react";
import { CalendarDays, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientsProfessionalFilter } from "@/components/patients/patients-table";
import type { OrgTeamMember } from "@/lib/queries/organizations";
import type { DoctorReportsFilters } from "@/lib/queries/doctor-reports";
import { cn } from "@/lib/utils";

const PRESETS = [
  { key: "30d", label: "30 días", days: 30 },
  { key: "3m", label: "3 meses", days: 90 },
  { key: "6m", label: "6 meses", days: 180 },
  { key: "12m", label: "12 meses", days: 365 },
] as const;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function rangeForDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { from: isoDate(from), to: isoDate(to) };
}

function displayDate(value?: string): string {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Campo de fecha con calendario nativo — mismo patrón que analysis-consumption-view. */
function CalendarField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  }

  return (
    <div className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={openPicker}
        className="relative flex h-9 min-w-[10.5rem] cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate font-medium tabular-nums text-foreground">
          {displayDate(value) || "Seleccionar"}
        </span>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </button>
    </div>
  );
}

export function ReportFilters({
  filters,
  onChange,
  members,
  showProfessionalFilter,
  onExport,
  exportDisabled,
}: {
  filters: DoctorReportsFilters;
  onChange: (next: DoctorReportsFilters) => void;
  members: OrgTeamMember[];
  showProfessionalFilter: boolean;
  onExport?: () => void;
  exportDisabled?: boolean;
}) {
  function applyPreset(days: number) {
    onChange({ ...filters, ...rangeForDays(days) });
  }

  const activePreset = PRESETS.find(
    (preset) => rangeForDays(preset.days).from === filters.from,
  )?.key;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/80 bg-card p-4">
      <div>
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Periodo
        </span>
        <div
          role="tablist"
          aria-label="Periodo"
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
        >
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              role="tab"
              aria-selected={activePreset === preset.key}
              onClick={() => applyPreset(preset.days)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activePreset === preset.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <CalendarField
        label="Desde"
        value={filters.from ?? ""}
        onChange={(from) => onChange({ ...filters, from })}
      />
      <CalendarField
        label="Hasta"
        value={filters.to ?? ""}
        onChange={(to) => onChange({ ...filters, to })}
      />

      {showProfessionalFilter ? (
        <PatientsProfessionalFilter
          members={members}
          value={filters.professionalUserId ?? "all"}
          onChange={(professionalUserId) =>
            onChange({ ...filters, professionalUserId })
          }
        />
      ) : null}

      {onExport ? (
        <Button
          variant="outline"
          onClick={onExport}
          disabled={exportDisabled}
          className="ml-auto gap-2"
        >
          <Download className="size-4" />
          Exportar
        </Button>
      ) : null}
    </div>
  );
}
