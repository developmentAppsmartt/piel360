"use client";

import type { SkinReportSegmentCategoryComparison } from "@piel360/shared";

/**
 * Tabla de detalle por categoría, una columna de puntaje por valor de
 * segmento — mismo lenguaje visual que top-problems-table.tsx.
 */
export function SegmentDetailTable({
  categories,
  segments,
}: {
  categories: SkinReportSegmentCategoryComparison[];
  segments: { value: string; label: string }[];
}) {
  if (categories.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin categorías con datos en el periodo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/80">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border/80 bg-muted/30 text-left">
            <th className="px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Categoría
            </th>
            {segments.map((segment) => (
              <th
                key={segment.value}
                className="w-32 px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {segment.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.key} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2.5 font-medium text-foreground">{category.label}</td>
              {segments.map((segment) => {
                const score = category.scoresBySegment[segment.value];
                return (
                  <td
                    key={segment.value}
                    className="px-3 py-2.5 text-right tabular-nums"
                  >
                    {score != null ? score.toFixed(0) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
