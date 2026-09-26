"use client";

import type { SkiniverAgeGenderRow } from "@piel360/shared";

/**
 * Widget "Enfermedades por edad y sexo": barras agrupadas por rango de edad.
 * SVG a mano — no hay librería de gráficos en el monorepo; la escala Y
 * dinámica sigue el mismo criterio que multi-series-trend-chart.tsx.
 *
 * La serie "Sin género" solo aparece si tiene datos: en una base donde nadie
 * tiene el género cargado, una tercera barra gris del alto de todo el gráfico
 * se lee como si fuera un tercer sexo.
 */
const SERIES = [
  { key: "male", label: "Hombres", color: "#3b82f6" },
  { key: "female", label: "Mujeres", color: "#14b8a6" },
  { key: "unknown", label: "Sin género", color: "#cbd5e1" },
] as const;

export function AgeGenderBars({ rows }: { rows: SkiniverAgeGenderRow[] }) {
  const hasAny = rows.some((r) => r.male + r.female + r.unknown > 0);
  if (!hasAny) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Requiere la fecha de nacimiento y el género del paciente. Complétalos en la
        ficha del paciente para ver este reporte.
      </p>
    );
  }

  const series = SERIES.filter(
    (s) => s.key !== "unknown" || rows.some((r) => r.unknown > 0),
  );

  const w = 640;
  const h = 220;
  const padX = 36;
  const padY = 16;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;

  const rawMax = Math.max(
    1,
    ...rows.flatMap((r) => series.map((s) => r[s.key])),
  );
  // Redondeo a un múltiplo "lindo" para que las marcas del eje sean legibles.
  const magnitude = 10 ** Math.floor(Math.log10(rawMax));
  const step = magnitude / 2 || 0.5;
  const yMax = Math.max(step, Math.ceil(rawMax / step) * step);

  const groupW = plotW / rows.length;
  const barW = Math.min(18, (groupW * 0.7) / series.length);
  const ticks = [0, yMax / 2, yMax];
  const toY = (value: number) => padY + (1 - value / yMax) * plotH;

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-4 text-xs">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{s.label}</span>
          </li>
        ))}
      </ul>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${w} ${h + 26}`}
          className="h-60 w-full min-w-[32rem]"
          role="img"
          aria-label="Diagnósticos por rango de edad y sexo"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={padX}
                x2={w - padX}
                y1={toY(tick)}
                y2={toY(tick)}
                className="stroke-border"
                strokeDasharray="4 4"
              />
              <text
                x={padX - 8}
                y={toY(tick) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {tick}
              </text>
            </g>
          ))}

          {rows.map((row, groupIndex) => {
            const groupX = padX + groupIndex * groupW;
            const groupCenter = groupX + groupW / 2;
            const barsW = barW * series.length + 2 * (series.length - 1);
            const firstX = groupCenter - barsW / 2;

            return (
              <g key={row.key}>
                {series.map((s, i) => {
                  const value = row[s.key];
                  const y = toY(value);
                  return (
                    <rect
                      key={s.key}
                      x={firstX + i * (barW + 2)}
                      y={y}
                      width={barW}
                      height={Math.max(0, padY + plotH - y)}
                      fill={s.color}
                      rx={2}
                    >
                      <title>{`${row.label} · ${s.label}: ${value}`}</title>
                    </rect>
                  );
                })}
                <text
                  x={groupCenter}
                  y={h + 14}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {row.key}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
