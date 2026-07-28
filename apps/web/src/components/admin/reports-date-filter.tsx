"use client";

import type { ReportGranularity, ReportsFilters } from "@/lib/queries/admin-reports";

const GRANULARITY_OPTIONS: { value: ReportGranularity; label: string }[] = [
  { value: "day", label: "Diario" },
  { value: "month", label: "Mensual" },
  { value: "year", label: "Anual" },
];

export function ReportsDateFilter({
  filters,
  onChange,
}: {
  filters: ReportsFilters;
  onChange: (next: ReportsFilters) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Desde</span>
        <input
          type="date"
          value={filters.startDate ?? ""}
          onChange={(e) => onChange({ ...filters, startDate: e.target.value || undefined })}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Hasta</span>
        <input
          type="date"
          value={filters.endDate ?? ""}
          onChange={(e) => onChange({ ...filters, endDate: e.target.value || undefined })}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Granularidad (serie de tiempo)</span>
        <select
          value={filters.granularity ?? "month"}
          onChange={(e) => onChange({ ...filters, granularity: e.target.value as ReportGranularity })}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        >
          {GRANULARITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
