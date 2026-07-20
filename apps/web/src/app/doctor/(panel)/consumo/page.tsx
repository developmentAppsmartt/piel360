"use client";

import { useMySubscriptions } from "@/lib/queries/subscriptions";

const PROVIDER_LABELS: Record<string, string> = {
  skiniver: "Skiniver (análisis de piel)",
  youcam: "YouCam (análisis facial)",
};

export default function ConsumoPage() {
  const subscriptions = useMySubscriptions();
  const active = subscriptions.data?.filter((s) => s.status === "active") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Consumo de análisis</h1>

      {subscriptions.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {!subscriptions.isLoading && active.length === 0 && (
        <p className="text-sm text-muted-foreground">No tienes suscripciones activas.</p>
      )}

      <div className="space-y-4">
        {active.map((sub) => {
          const used = sub.plan.analysisLimit - sub.remainingCredits;
          const percent = sub.plan.analysisLimit > 0 ? (used / sub.plan.analysisLimit) * 100 : 0;
          return (
            <div key={sub.id} className="space-y-2 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {PROVIDER_LABELS[sub.plan.provider.slug] ?? sub.plan.provider.name} — {sub.plan.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {used} de {sub.plan.analysisLimit} análisis usados
                </p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Vence el {sub.endsAt ? new Date(sub.endsAt).toLocaleDateString("es-CO") : "—"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
