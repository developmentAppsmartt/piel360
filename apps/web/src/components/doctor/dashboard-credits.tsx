import Link from "next/link";
import type { Subscription } from "@/lib/queries/subscriptions";

const PROVIDER_LABELS: Record<string, string> = {
  skiniver: "Skiniver (análisis de piel)",
  youcam: "YouCam (análisis facial)",
};

/** Versión compacta de la barra de progreso de consumo/page.tsx, para el
 * dashboard del doctor — mismo cálculo (`analysisLimit - remainingCredits`). */
export function DashboardCredits({ subscriptions }: { subscriptions: Subscription[] }) {
  const active = subscriptions.filter((s) => s.status === "active");

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Créditos de análisis</h2>
        <Link href="/doctor/consumo" className="text-xs text-primary hover:underline">
          Ver consumo
        </Link>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tienes suscripciones activas.</p>
      ) : (
        <div className="space-y-3">
          {active.map((sub) => {
            const used = sub.plan.analysisLimit - sub.remainingCredits;
            const percent = sub.plan.analysisLimit > 0 ? (used / sub.plan.analysisLimit) * 100 : 0;
            return (
              <div key={sub.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{PROVIDER_LABELS[sub.plan.provider.slug] ?? sub.plan.provider.name}</span>
                  <span className="text-muted-foreground">
                    {sub.remainingCredits} de {sub.plan.analysisLimit} restantes
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
