import type { AdminReports } from "@/lib/queries/admin-reports";

// Mismos colores ya usados en subscription-stats.tsx para cada estado.
const BARS: {
  key: keyof AdminReports["subscriptionStatus"];
  label: string;
  color: string;
}[] = [
  { key: "active", label: "Activas", color: "#22c55e" },
  { key: "pending", label: "Pendientes", color: "#facc15" },
  { key: "expired", label: "Vencidas", color: "#ef4444" },
];

/** Port de SubscriptionStatusChart.php (Filament) — sin filtro de fecha a
 * propósito (ver plan): es una foto del estado actual de las suscripciones,
 * no un conteo de eventos en un rango. Barra horizontal en vez del donut
 * original, mismo patrón que risk-chart.tsx. */
export function SubscriptionStatusChart({
  subscriptionStatus,
}: {
  subscriptionStatus: AdminReports["subscriptionStatus"];
}) {
  const max = Math.max(
    subscriptionStatus.active,
    subscriptionStatus.pending,
    subscriptionStatus.expired,
    1,
  );

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-muted-foreground">Estado de suscripciones</h2>
      <div className="space-y-3">
        {BARS.map((bar) => {
          const value = subscriptionStatus[bar.key];
          const percent = (value / max) * 100;
          return (
            <div key={bar.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-muted-foreground">{bar.label}</span>
              <div className="h-5 flex-1 rounded-full bg-muted">
                <div
                  className="h-5 rounded-full transition-all"
                  style={{ width: `${percent}%`, backgroundColor: bar.color }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-medium">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
