"use client";

import type { SkiniverCategorySlice } from "@piel360/shared";
import { SegmentDistributionDonut } from "@/components/reports/segment-distribution-donut";

/**
 * Widget "Enfermedades de la piel por categorías". Reusa
 * SegmentDistributionDonut mapeando `count` → `patients` (ese componente no le
 * da otro uso al campo), igual que hace skin-tone-widget.tsx.
 *
 * Las categorías son las que la IA ya devuelve en `aiRawResponse.desease`, no
 * una deducción sobre el nombre del diagnóstico.
 */
export function DiagnosisCategoryDonut({
  slices,
  total,
}: {
  slices: SkiniverCategorySlice[];
  total: number;
}) {
  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay diagnósticos en el periodo seleccionado.
      </p>
    );
  }

  return (
    <SegmentDistributionDonut
      total={total}
      centerLabel="Total diagnósticos"
      buckets={slices.map((slice) => ({
        value: slice.key,
        label: slice.label,
        color: slice.color,
        patients: slice.count,
        analyses: slice.count,
        pct: slice.pct,
        avgScore: null,
      }))}
    />
  );
}
