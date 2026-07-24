import type { AdminReports } from "@/lib/queries/admin-reports";

// Paleta categórica fija (nunca ciclada) — distinta de la semántica
// verde/ámbar/rojo ya reservada para riesgo/estado en risk-chart.tsx y
// subscription-status-chart.tsx, porque acá no hay una noción de severidad.
// "Otros" siempre va en gris al final, sin importar cuántas clases reales
// entren en el top 8.
const CATEGORY_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#ec4899",
  "#6366f1",
  "#06b6d4",
  "#84cc16",
];
const OTHER_COLOR = "#71717a";

/** Port de DiagnosisByClassChart.php (Filament) — `aiDiagnosis` es un string
 * libre (sin enum), agrupado y acotado a las 8 clases más frecuentes + "Otros"
 * en el backend (admin.service.ts#getDiagnosisByClass). Barra horizontal en
 * vez del bar chart de Chart.js original, mismo patrón que risk-chart.tsx. */
export function DiagnosisByClassChart({
  diagnosisByClass,
}: {
  diagnosisByClass: AdminReports["diagnosisByClass"];
}) {
  const max = Math.max(...diagnosisByClass.map((d) => d.count), 1);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-muted-foreground">Diagnósticos por clase</h2>
      {diagnosisByClass.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos en el rango seleccionado.</p>
      ) : (
        <div className="space-y-3">
          {diagnosisByClass.map((item, index) => {
            const percent = (item.count / max) * 100;
            const color = item.label === "Otros" ? OTHER_COLOR : CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            return (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm text-muted-foreground" title={item.label}>
                  {item.label}
                </span>
                <div className="h-5 flex-1 rounded-full bg-muted">
                  <div
                    className="h-5 rounded-full transition-all"
                    style={{ width: `${percent}%`, backgroundColor: color }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-medium">{item.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
