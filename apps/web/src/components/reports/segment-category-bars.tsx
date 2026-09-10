"use client";

import type { SkinReportSegmentCategoryComparison } from "@piel360/shared";

/**
 * Variante multi-serie de CategoryRankingBars: una mini-barra por valor de
 * segmento dentro de cada fila de categoría, en vez de una sola barra. Mismo
 * lenguaje visual (track bg-muted + fill con width en %).
 */
export function SegmentCategoryBars({
  categories,
  segments,
  limit = 8,
}: {
  categories: SkinReportSegmentCategoryComparison[];
  segments: { value: string; label: string; color: string }[];
  limit?: number;
}) {
  const rows = categories.slice(0, limit);

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sin categorías con datos en el periodo.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {rows.map((category) => (
          <li key={category.key} className="space-y-1.5">
            <span className="text-sm text-foreground">{category.label}</span>
            <div className="space-y-1">
              {segments.map((segment) => {
                const score = category.scoresBySegment[segment.value];
                return (
                  <div key={segment.value} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
                      {segment.label}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, score ?? 0))}%`,
                          backgroundColor: segment.color,
                        }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums">
                      {score != null ? score.toFixed(0) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {segments.map((segment) => (
          <li key={segment.value} className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: segment.color }}
              aria-hidden
            />
            {segment.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
