"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  skinReportBand,
  skinReportBandColor,
  type SkinReportCategory,
} from "@piel360/shared";
import { cn } from "@/lib/utils";

export type TopProblemsSort = "score" | "affected" | "trend";

const SORT_OPTIONS: { value: TopProblemsSort; label: string }[] = [
  { value: "score", label: "Puntuación más baja" },
  { value: "affected", label: "Pacientes afectados" },
  { value: "trend", label: "Peor evolución" },
];

export function sortCategories(
  categories: SkinReportCategory[],
  sort: TopProblemsSort,
): SkinReportCategory[] {
  const rows = [...categories];
  if (sort === "affected") {
    rows.sort((a, b) => b.affectedPct - a.affectedPct);
  } else if (sort === "trend") {
    // Sin dato de evolución al final: no se puede ordenar por lo que no existe.
    rows.sort((a, b) => (a.trendDelta ?? Infinity) - (b.trendDelta ?? Infinity));
  } else {
    rows.sort((a, b) => (a.avgScore ?? Infinity) - (b.avgScore ?? Infinity));
  }
  return rows;
}

function TrendCell({ delta }: { delta: number | null }) {
  if (delta == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3.5" aria-hidden />—
      </span>
    );
  }
  const improved = delta > 0;
  const flat = Math.abs(delta) < 0.5;
  const Icon = flat ? Minus : improved ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
        flat
          ? "text-muted-foreground"
          : improved
            ? "text-emerald-600"
            : "text-red-600",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {delta > 0 ? "+" : ""}
      {delta.toFixed(1)}
    </span>
  );
}

/**
 * Tabla del top de problemas. No usa DataTable a propósito: para ≤20 filas el
 * buscador global y la paginación de 25/50/100 sobran, y el mockup pide un
 * selector "Ordenar por" en su lugar.
 */
export function TopProblemsTable({
  categories,
  limit = 10,
  sort,
  onSortChange,
}: {
  categories: SkinReportCategory[];
  limit?: number;
  sort: TopProblemsSort;
  onSortChange: (sort: TopProblemsSort) => void;
}) {
  const rows = useMemo(
    () => sortCategories(categories, sort).slice(0, limit),
    [categories, sort, limit],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Categorías que más necesitan intervención según el criterio elegido.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Ordenar por</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as TopProblemsSort)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-ring"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin categorías con datos en el periodo.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/30 text-left">
                <th className="w-14 px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  #
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Categoría
                </th>
                <th className="w-56 px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Puntaje promedio
                </th>
                <th className="w-40 px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Pacientes afectados
                </th>
                <th className="w-32 px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Evolución
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((category, index) => {
                const score = category.avgScore ?? 0;
                const color = skinReportBandColor(skinReportBand(score));
                return (
                  <tr
                    key={category.key}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      {category.label}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.max(0, Math.min(100, score))}%`,
                              backgroundColor: color,
                            }}
                          />
                        </span>
                        <span className="w-8 text-right font-semibold tabular-nums">
                          {score.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {category.affectedPct.toFixed(0)}%
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({category.patientsAffected}/{category.patients})
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <TrendCell delta={category.trendDelta} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        &ldquo;Pacientes afectados&rdquo; son los que registraron un puntaje menor a 70 en
        esa categoría durante el periodo. La evolución compara el primer y el último mes
        con datos de la ventana de tendencia.
      </p>
    </div>
  );
}
