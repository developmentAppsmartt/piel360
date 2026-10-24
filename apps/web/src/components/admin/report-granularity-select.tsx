"use client";

import type { ReportGranularity } from "@/lib/queries/admin-reports";

const GRANULARITY_OPTIONS: { value: ReportGranularity; label: string }[] = [
  { value: "day", label: "Diario" },
  { value: "month", label: "Mensual" },
  { value: "year", label: "Anual" },
];

/** Agrupación de la serie de análisis de la pestaña «General». Las fechas
 * vienen de los filtros comunes de la página. */
export function ReportGranularitySelect({
  value,
  onChange,
}: {
  value: ReportGranularity;
  onChange: (next: ReportGranularity) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Agrupar por</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ReportGranularity)}
        className="h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-ring"
      >
        {GRANULARITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
