"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReportDelta } from "@piel360/shared";
import { ModuleCard, ModuleMetric } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";

/** Cómo se lee la variación: % relativo, puntos de puntaje o años. */
export type DeltaFormat = "pct" | "points" | "years";

function formatValue(
  value: number | null,
  unit: DeltaFormat | "count",
  decimals: number,
): string {
  if (value == null) return "—";
  if (unit === "pct") return `${value.toFixed(decimals)}%`;
  if (unit === "years") return `${value > 0 ? "+" : ""}${value.toFixed(decimals)} años`;
  return value.toLocaleString("es-CO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDelta(delta: ReportDelta, format: DeltaFormat): string | null {
  if (format === "pct") {
    if (delta.deltaPct == null) return null;
    const sign = delta.deltaPct > 0 ? "+" : "";
    return `${sign}${delta.deltaPct.toFixed(1)}%`;
  }
  if (delta.delta == null) return null;
  const sign = delta.delta > 0 ? "+" : "";
  const suffix = format === "years" ? " años" : " pts";
  return `${sign}${delta.delta.toFixed(1)}${suffix}`;
}

/**
 * Tarjeta KPI con variación respecto al periodo anterior. Es el único patrón
 * de tarjeta de la app que muestra delta (StatCard de doctor-analyses-hub no
 * lo tiene), por eso vive acá y no se reusa aquel.
 */
export function ReportKpiCard({
  label,
  delta,
  unit = "count",
  decimals = 0,
  deltaFormat = "pct",
  /** false = subir es peor (ej. % de pacientes críticos). */
  higherIsBetter = true,
  hint,
}: {
  label: string;
  delta: ReportDelta;
  unit?: DeltaFormat | "count";
  decimals?: number;
  deltaFormat?: DeltaFormat;
  higherIsBetter?: boolean;
  hint?: string;
}) {
  const deltaText = formatDelta(delta, deltaFormat);
  const raw = deltaFormat === "pct" ? delta.deltaPct : delta.delta;
  const improved = raw == null || raw === 0 ? null : raw > 0 === higherIsBetter;

  const Icon = raw == null || raw === 0 ? Minus : raw > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <ModuleCard className="flex flex-col gap-2 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ModuleMetric className="text-[1.75rem]">
        {formatValue(delta.current, unit, decimals)}
      </ModuleMetric>
      <div className="flex items-center gap-1.5 text-xs">
        {deltaText ? (
          <>
            <Icon
              className={cn(
                "size-3.5 shrink-0",
                improved == null
                  ? "text-muted-foreground"
                  : improved
                    ? "text-emerald-600"
                    : "text-red-600",
              )}
              aria-hidden
            />
            <span
              className={cn(
                "font-semibold tabular-nums",
                improved == null
                  ? "text-muted-foreground"
                  : improved
                    ? "text-emerald-600"
                    : "text-red-600",
              )}
            >
              {deltaText}
            </span>
            <span className="text-muted-foreground">vs periodo anterior</span>
          </>
        ) : (
          <span className="text-muted-foreground">
            {hint ?? "Sin datos del periodo anterior"}
          </span>
        )}
      </div>
    </ModuleCard>
  );
}

/** Variante para las tarjetas de "mejor / peor categoría" (sin delta). */
export function ReportHighlightCard({
  label,
  category,
  tone,
}: {
  label: string;
  category: { label: string; avgScore: number } | null;
  tone: "good" | "bad";
}) {
  return (
    <ModuleCard className="flex flex-col gap-2 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {category ? (
        <>
          <p
            className={cn(
              "text-lg font-bold leading-tight",
              tone === "good" ? "text-emerald-700" : "text-red-700",
            )}
          >
            {category.label}
          </p>
          <p className="text-xs text-muted-foreground">
            Puntaje promedio{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {category.avgScore.toFixed(0)}
            </span>
          </p>
        </>
      ) : (
        <>
          <ModuleMetric className="text-[1.75rem]">—</ModuleMetric>
          <p className="text-xs text-muted-foreground">Sin datos suficientes</p>
        </>
      )}
    </ModuleCard>
  );
}
