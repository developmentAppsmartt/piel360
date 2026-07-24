import type { AdminReports } from "@/lib/queries/admin-reports";

const LINE_COLOR = "#3b82f6";
const CHART_WIDTH = 300;
const CHART_HEIGHT = 100;
const MAX_X_LABELS = 6;

/** Port de TimeSeriesAnalysisChart.php (Filament) — línea/área simple en SVG
 * a mano (sin librería de gráficos), mismo lenguaje visual minimalista que
 * risk-chart.tsx (trazo simple, sin tooltip/hover — ningún otro chart de la
 * app hoy es interactivo). `timeSeries` ya viene agrupado por día/mes/año
 * desde el backend según la granularidad elegida. */
export function AnalysesTimeSeriesChart({ timeSeries }: { timeSeries: AdminReports["timeSeries"] }) {
  if (timeSeries.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium text-muted-foreground">Análisis en el tiempo</h2>
        <p className="text-sm text-muted-foreground">Sin datos en el rango seleccionado.</p>
      </div>
    );
  }

  const max = Math.max(...timeSeries.map((d) => d.count), 1);
  const points = timeSeries.map((d, i) => {
    const x = timeSeries.length === 1 ? CHART_WIDTH / 2 : (i / (timeSeries.length - 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - (d.count / max) * CHART_HEIGHT;
    return { x, y, period: d.period, count: d.count };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${CHART_HEIGHT} L${points[0].x},${CHART_HEIGHT} Z`;

  const labelStep = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-muted-foreground">Análisis en el tiempo</h2>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
      >
        <path d={areaPath} fill={LINE_COLOR} fillOpacity={0.15} stroke="none" />
        <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {points.map((p) => (
          <circle key={p.period} cx={p.x} cy={p.y} r={2} fill={LINE_COLOR} />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        {points
          .filter((_, i) => i % labelStep === 0 || i === points.length - 1)
          .map((p) => (
            <span key={p.period}>{p.period}</span>
          ))}
      </div>
    </div>
  );
}
