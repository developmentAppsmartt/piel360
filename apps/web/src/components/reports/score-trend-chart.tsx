"use client";

/**
 * Línea de evolución del puntaje promedio. Adaptación de DualLineChart
 * (analysis-consumption-view.tsx) a una sola serie, con una diferencia clave:
 * tolera meses sin datos (avgScore null) partiendo la línea en segmentos en vez
 * de dibujar una caída a 0.
 */
export function ScoreTrendChart({
  points,
  emptyMessage = "No hay análisis en el periodo seleccionado.",
  height = "h-56",
}: {
  points: { period: string; avgScore: number | null }[];
  emptyMessage?: string;
  height?: string;
}) {
  const w = 640;
  const h = 200;
  const padX = 32;
  const padY = 24;

  const withData = points.filter((p) => p.avgScore != null);
  if (withData.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  // Escala fija 0-100: los puntajes de piel siempre viven en ese rango, y así
  // dos periodos distintos son comparables a simple vista.
  const yMin = 0;
  const yMax = 100;
  const toX = (i: number) =>
    padX + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (w - padX * 2));
  const toY = (v: number) =>
    padY + (1 - (v - yMin) / (yMax - yMin)) * (h - padY * 2);

  // Segmentos contiguos de puntos con dato (los huecos parten la línea).
  const segments: { i: number; value: number }[][] = [];
  let current: { i: number; value: number }[] = [];
  points.forEach((p, i) => {
    if (p.avgScore == null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ i, value: p.avgScore });
  });
  if (current.length) segments.push(current);

  const ticks = [0, 25, 50, 75, 100];
  // Con muchos meses, diezmar las etiquetas del eje X para que no se solapen.
  const labelStep = Math.ceil(points.length / 8);

  return (
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
              {t}
            </text>
          </g>
        ))}

        {segments.map((segment) => (
          <polyline
            key={`seg-${segment[0].i}`}
            fill="none"
            strokeWidth="2.5"
            points={segment.map((p) => `${toX(p.i)},${toY(p.value)}`).join(" ")}
            className="stroke-primary"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {points.map((p, i) =>
          p.avgScore == null ? null : (
            <g key={p.period}>
              <circle cx={toX(i)} cy={toY(p.avgScore)} r="4" className="fill-primary" />
              <text
                x={toX(i)}
                y={toY(p.avgScore) - 10}
                textAnchor="middle"
                className="fill-primary text-[10px] font-semibold"
              >
                {p.avgScore.toFixed(0)}
              </text>
            </g>
          ),
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
  );
}
