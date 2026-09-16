"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TrendSeriesDef {
  key: string;
  label: string;
  color: string;
}

export interface TrendSeriesPoint {
  period: string;
  /** Conteo por clave de serie (mismas claves que TrendSeriesDef.key). */
  counts: Record<string, number>;
}

/**
 * Generalización de ScoreTrendChart (score-trend-chart.tsx) a N series por
 * mes, con leyenda clicable para aislar/ocultar series — necesario acá
 * porque el widget de "diagnósticos por enfermedad" tiene hasta 10 series,
 * demasiadas para verlas todas legibles a la vez.
 *
 * A diferencia de ScoreTrendChart: escala Y dinámica (son conteos, no
 * puntajes 0-100) y sin etiqueta numérica sobre cada punto (con N series por
 * mes se encimarían).
 */
export function MultiSeriesTrendChart({
  points,
  series,
  emptyMessage = "No hay diagnósticos en el periodo seleccionado.",
  height = "h-64",
}: {
  points: TrendSeriesPoint[];
  series: TrendSeriesDef[];
  emptyMessage?: string;
  height?: string;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visibleSeries = series.filter((s) => !hidden.has(s.key));
  const hasAnyData = points.some((p) =>
    series.some((s) => (p.counts[s.key] ?? 0) > 0),
  );

  if (!hasAnyData) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  const w = 640;
  const h = 220;
  const padX = 32;
  const padY = 16;

  const maxValue = Math.max(
    1,
    ...points.flatMap((p) => visibleSeries.map((s) => p.counts[s.key] ?? 0)),
  );
  // Redondea el techo del eje Y a un número "lindo" (siguiente múltiplo de 5,
  // o de una potencia de 10 acorde a la magnitud) para que las líneas de
  // grilla no queden en valores raros como "17".
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  const yMax = Math.ceil(maxValue / (magnitude / 2)) * (magnitude / 2) || 1;

  const toX = (i: number) =>
    padX + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (w - padX * 2));
  const toY = (v: number) => padY + (1 - v / yMax) * (h - padY * 2);

  const ticks = [0, yMax / 2, yMax];
  const labelStep = Math.ceil(points.length / 8);

  function segmentsFor(key: string) {
    const segments: { i: number; value: number }[][] = [];
    let current: { i: number; value: number }[] = [];
    points.forEach((p, i) => {
      const value = p.counts[key];
      if (value == null) {
        if (current.length) segments.push(current);
        current = [];
        return;
      }
      current.push({ i, value });
    });
    if (current.length) segments.push(current);
    return segments;
  }

  return (
    <div className="space-y-3">
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h + 28}`} className={`${height} w-full min-w-[480px]`}>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padX}
                x2={w - padX}
                y1={toY(t)}
                y2={toY(t)}
                className="stroke-border"
                strokeDasharray="4 4"
              />
              <text
                x={padX - 8}
                y={toY(t) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {Math.round(t)}
              </text>
            </g>
          ))}

          {visibleSeries.map((s) =>
            segmentsFor(s.key).map((segment) => (
              <polyline
                key={`${s.key}-${segment[0].i}`}
                fill="none"
                strokeWidth="2"
                points={segment.map((p) => `${toX(p.i)},${toY(p.value)}`).join(" ")}
                stroke={s.color}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )),
          )}

          {visibleSeries.map((s) =>
            points.map((p, i) => {
              const value = p.counts[s.key];
              if (value == null) return null;
              return (
                <circle
                  key={`${s.key}-dot-${p.period}`}
                  cx={toX(i)}
                  cy={toY(value)}
                  r="3"
                  fill={s.color}
                />
              );
            }),
          )}

          {points.map((p, i) =>
            i % labelStep === 0 || i === points.length - 1 ? (
              <text
                key={`label-${p.period}`}
                x={toX(i)}
                y={h + 16}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {p.period}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {series.map((s) => {
          const isHidden = hidden.has(s.key);
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() =>
                  setHidden((prev) => {
                    const next = new Set(prev);
                    if (next.has(s.key)) next.delete(s.key);
                    else next.add(s.key);
                    return next;
                  })
                }
                className={cn(
                  "flex items-center gap-1.5 rounded px-1 py-0.5 transition-opacity hover:bg-muted/50",
                  isHidden && "opacity-40",
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <span className={cn("text-muted-foreground", !isHidden && "text-foreground")}>
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
