"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WompiCheckoutButton } from "@/components/payments/wompi-checkout-button";
import { usePlans } from "@/lib/queries/plans";
import { useMySubscriptions } from "@/lib/queries/subscriptions";

function formatCOP(price: string) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(price),
  );
}

/** Compartido entre /doctor/planes y /patient/planes — mismo requisito para
 * ambos paneles (MIGRACION.md/PLAN-MIGRACION.md §viernes). */
export function PlansBrowser() {
  const plans = usePlans();
  const subscriptions = useMySubscriptions();
  const [providerId, setProviderId] = useState<string | null>(null);

  const providers = useMemo(() => {
    const seen = new Map<string, string | null>();
    for (const p of plans.data ?? []) seen.set(p.provider.id, p.provider.displayLabel);
    return Array.from(seen, ([id, displayLabel]) => ({ id, displayLabel }));
  }, [plans.data]);

  const activeProvider = providerId ?? providers[0]?.id ?? null;
  const visiblePlans = plans.data?.filter((p) => p.provider.id === activeProvider) ?? [];
  const activeSubscriptions = subscriptions.data?.filter((s) => s.status === "active") ?? [];

  return (
    <div className="space-y-6">
      {activeSubscriptions.length > 0 && (
        <section className="space-y-2 rounded-lg border border-border p-4">
          <h2 className="text-lg font-medium">Suscripciones activas</h2>
          <ul className="space-y-2 text-sm">
            {activeSubscriptions.map((sub) => (
              <li key={sub.id} className="flex items-center justify-between gap-2">
                <span>
                  {sub.plan.provider.displayLabel ?? "Análisis"} — {sub.plan.name}
                </span>
                <span className="text-muted-foreground">
                  Vence el {sub.endsAt ? new Date(sub.endsAt).toLocaleDateString("es-CO") : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plans.isLoading && <p className="text-muted-foreground">Cargando planes...</p>}

      {providers.length > 0 && (
        <div className="flex gap-2">
          {providers.map((provider) => (
            <Button
              key={provider.id}
              type="button"
              variant={activeProvider === provider.id ? "default" : "outline"}
              size="sm"
              onClick={() => setProviderId(provider.id)}
            >
              {provider.displayLabel ?? "Análisis"}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePlans.map((plan) => (
          <div key={plan.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div>
              <h3 className="font-medium">{plan.name}</h3>
              {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <Badge variant="outline">{plan.analysisLimit} análisis</Badge>
              </p>
              <p className="text-lg font-semibold">{formatCOP(plan.price)}</p>
              <p className="text-muted-foreground">Vigencia: {plan.durationDays} días</p>
            </div>
            <WompiCheckoutButton planId={plan.id} label="Suscribirse" />
          </div>
        ))}
      </div>
    </div>
  );
}
