"use client";

import type { SkinReportDistributionSlice } from "@piel360/shared";

/**
 * Dona de las 4 bandas de puntaje. Extiende el patrón de UnitRing
 * (strokeDasharray/strokeDashoffset sobre un círculo rotado -90°) a varios
 * segmentos encadenando el offset de cada banda.
 */
export function ScoreDistributionDonut({
  slices,
  total,
}: {
  slices: SkinReportDistributionSlice[];
  total: number;
}) {
  const r = 60;
  const c = 2 * Math.PI * r;

  // Offset acumulado: cada segmento arranca donde terminó el anterior.
  let consumed = 0;
  const arcs = slices
    .filter((slice) => slice.count > 0)
    .map((slice) => {
      const fraction = total > 0 ? slice.count / total : 0;
      const arc = {
        ...slice,
        dash: `${fraction * c} ${c - fraction * c}`,
        offset: -consumed * c,
      };
      consumed += fraction;
      return arc;
    });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            strokeWidth="20"
            className="stroke-muted"
          />
          {arcs.map((arc) => (
            <circle
              key={arc.band}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              strokeWidth="20"
              stroke={arc.color}
              strokeDasharray={arc.dash}
              strokeDashoffset={arc.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
          <span className="text-2xl font-bold tabular-nums">
            {total.toLocaleString("es-CO")}
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground">
            {total === 1 ? "Análisis" : "Análisis"}
          </span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {slices.map((slice) => (
          <li key={slice.band} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: slice.color }}
              aria-hidden
            />
            <span className="flex-1 text-foreground">{slice.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {slice.count}
            </span>
            <span className="w-12 text-right font-semibold tabular-nums">
              {slice.pct.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
