"use client";

import type { SkinReportCategory } from "@piel360/shared";
import { cn } from "@/lib/utils";

/**
 * Ranking de categorías en barras horizontales — mismo lenguaje visual que
 * risk-chart.tsx / diagnosis-by-class-chart.tsx (track bg-muted + fill con
 * width en %). La barra representa el puntaje sobre 100.
 *
 * Ojo: más alto = mejor, así que "necesidades" son los puntajes más BAJOS.
 */
export function CategoryRankingBars({
  categories,
  variant,
  selectedKey,
  onSelect,
}: {
  categories: SkinReportCategory[];
  variant: "needs" | "strengths";
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sin categorías con datos en el periodo.
      </p>
    );
  }

  const color = variant === "needs" ? "#ef4444" : "#22c55e";

  return (
    <ol className="space-y-1.5">
      {categories.map((category, index) => {
        const score = category.avgScore ?? 0;
        const active = selectedKey === category.key;
        return (
          <li key={category.key}>
            <button
              type="button"
              onClick={() => onSelect?.(category.key)}
              disabled={!onSelect}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors",
                onSelect && "hover:bg-muted/50",
                active && "bg-primary/5 ring-1 ring-primary/30",
                !onSelect && "cursor-default",
              )}
            >
              <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="w-36 shrink-0 truncate text-sm text-foreground">
                {category.label}
              </span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, score))}%`,
                    backgroundColor: color,
                  }}
                />
              </span>
              <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
                {score.toFixed(0)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
