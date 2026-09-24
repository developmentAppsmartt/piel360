"use client";

import type { SkiniverCategorySlice } from "@piel360/shared";

/**
 * Widget "Distribución de diagnósticos por edad": barras horizontales con el
 * conteo y su porcentaje. Mismo patrón div-based que lifestyle-report-panel.tsx
 * en `mode="volume"` — el ancho es relativo al bucket más alto, no al 100%,
 * para que la comparación entre rangos se vea aunque todos sean pequeños.
 */
export function AgeDistributionBars({
  slices,
}: {
  slices: SkiniverCategorySlice[];
}) {
  const max = Math.max(...slices.map((s) => s.count), 0);

  if (max === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Requiere la fecha de nacimiento del paciente. Complétala en la ficha del
        paciente para ver este reporte.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {slices.map((slice) => (
        <li key={slice.key} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 text-muted-foreground">{slice.label}</span>
          <span className="h-5 flex-1 overflow-hidden rounded-md bg-muted">
            <span
              className="block h-full rounded-md"
              style={{
                // Mínimo visible para que un bucket con datos no parezca vacío.
                width: `${Math.max(2, (slice.count / max) * 100)}%`,
                backgroundColor: slice.color,
              }}
            />
          </span>
          <span className="w-24 shrink-0 text-right tabular-nums">
            <span className="font-semibold">{slice.count}</span>{" "}
            <span className="text-xs text-muted-foreground">
              ({slice.pct.toFixed(1)}%)
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
