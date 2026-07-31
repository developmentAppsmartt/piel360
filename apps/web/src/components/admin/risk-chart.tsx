import type { AdminDashboardStats } from "@/lib/queries/admin-dashboard";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";

// Mismos colores ya usados para nivel de riesgo en risk-gauge.tsx/diagnosis-list.tsx
// — se reutiliza el mismo triple para que el riesgo se vea igual en toda la app.
const BARS: {
  key: keyof AdminDashboardStats["riskDistribution"];
  label: string;
  color: string;
}[] = [
  { key: "low", label: "Riesgo bajo", color: "#22c55e" },
  { key: "medium", label: "Riesgo medio", color: "#facc15" },
  { key: "high", label: "Riesgo alto", color: "#ef4444" },
];

/** Port de RiskChart.php (Filament) — distribución de análisis por
 * probabilidad de riesgo. Sin librería de gráficos: barras simples con
 * `div`, mismo criterio que las barras de progreso ya usadas en la app. */
export function RiskChart({
  riskDistribution,
}: {
  riskDistribution: AdminDashboardStats["riskDistribution"];
}) {
  const max = Math.max(
    riskDistribution.low,
    riskDistribution.medium,
    riskDistribution.high,
    1,
  );

  return (
    <ModuleCard className="space-y-4 p-4">
      <ModuleCardTitle className="text-sm text-muted-foreground font-medium">
        Distribución de riesgo
      </ModuleCardTitle>
      <div className="space-y-3">
        {BARS.map((bar) => {
          const value = riskDistribution[bar.key];
          const percent = (value / max) * 100;
          return (
            <div key={bar.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-muted-foreground">
                {bar.label}
              </span>
              <div className="h-5 flex-1 rounded-full bg-muted">
                <div
                  className="h-5 rounded-full transition-all"
                  style={{ width: `${percent}%`, backgroundColor: bar.color }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </ModuleCard>
  );
}
