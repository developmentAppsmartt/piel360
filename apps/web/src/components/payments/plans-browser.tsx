"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WompiCheckoutButton } from "@/components/payments/wompi-checkout-button";
import { PlanTeamFeaturesBlock } from "@/components/payments/plan-features-display";
import { formatCOP, providerLabel } from "@/components/payments/subscription-utils";
import type { Plan } from "@piel360/shared";
import { useMyDoctorProfile, isEnterpriseDoctor } from "@/lib/queries/doctors";
import { usePlans } from "@/lib/queries/plans";
import { useMySubscriptions } from "@/lib/queries/subscriptions";

function planProviderSlugs(plan: Plan): string[] {
  if (plan.providers?.length) return plan.providers.map((p) => p.slug);
  return [plan.provider.slug];
}

function planAnalysisLabels(plan: Plan): string[] {
  return planProviderSlugs(plan).map((slug) =>
    providerLabel(slug, plan.provider.name),
  );
}

/** Compartido entre /doctor/planes y /patient/planes */
export function PlansBrowser({
  hideActiveSection = false,
  showTeamFeatures,
  planTypeFilter,
}: {
  hideActiveSection?: boolean;
  showTeamFeatures?: boolean;
  planTypeFilter?: "individual" | "business";
}) {
  const plans = usePlans();
  const subscriptions = useMySubscriptions();
  const doctorProfile = useMyDoctorProfile();
  const isEmpresa =
    showTeamFeatures ??
    (doctorProfile.data ? isEnterpriseDoctor(doctorProfile.data) : false);
  const [providerSlug, setProviderSlug] = useState<string | null>(null);

  const providers = useMemo(() => {
    const catalog =
      plans.data?.filter((p) => {
        if (planTypeFilter && (p.planType ?? "business") !== planTypeFilter) return false;
        return true;
      }) ?? [];
    const slugs = new Set(catalog.flatMap((p) => planProviderSlugs(p)));
    const list = Array.from(slugs);
    const allowed = doctorProfile.data?.allowedProviderSlugs;
    if (!allowed) return list;
    return list.filter((slug) => allowed.includes(slug));
  }, [plans.data, planTypeFilter, doctorProfile.data?.allowedProviderSlugs]);

  const activeProvider = providerSlug ?? providers[0] ?? null;
  const visiblePlans =
    plans.data?.filter((p) => {
      if (planTypeFilter && (p.planType ?? "business") !== planTypeFilter) return false;
      if (!activeProvider) return false;
      return planProviderSlugs(p).includes(activeProvider);
    }) ?? [];
  const activeSubscriptions = subscriptions.data?.filter((s) => s.status === "active") ?? [];

  return (
    <div className="space-y-6">
      {!hideActiveSection && activeSubscriptions.length > 0 && (
        <section className="space-y-2 rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-medium">Suscripciones activas</h2>
          <ul className="space-y-2 text-sm">
            {activeSubscriptions.map((sub) => (
              <li key={sub.id} className="flex items-center justify-between gap-2">
                <span>
                  {providerLabel(sub.plan.provider.slug, sub.plan.provider.name)} — {sub.plan.name}
                </span>
                <span className="text-muted-foreground">
                  {sub.remainingCredits} créditos · vence{" "}
                  {sub.endsAt ? new Date(sub.endsAt).toLocaleDateString("es-CO") : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plans.isLoading && <p className="text-muted-foreground">Cargando planes...</p>}

      {!plans.isLoading && visiblePlans.length === 0 && providers.length > 0 && (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No hay planes disponibles para contratar en este momento. Si tienes una suscripción activa,
          revisa el estado de tu plan actual arriba.
        </p>
      )}

      {providers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {providers.map((slug) => (
            <Button
              key={slug}
              type="button"
              variant={activeProvider === slug ? "default" : "outline"}
              size="sm"
              onClick={() => setProviderSlug(slug)}
            >
              {providerLabel(slug)}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePlans.map((plan) => {
          const labels = planAnalysisLabels(plan);
          const isPackage = labels.length > 1;
          return (
            <div
              key={plan.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div>
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                {plan.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                ) : null}
              </div>
              <div className="space-y-2 text-sm">
                {isPackage ? (
                  <div className="flex flex-wrap gap-1.5">
                    {labels.map((label) => (
                      <Badge key={label} variant="secondary" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Badge variant="outline">{labels[0] ?? "Análisis IA"}</Badge>
                )}
                <Badge variant="outline">{plan.analysisLimit} análisis incluidos</Badge>
                <p className="text-2xl font-bold text-foreground">{formatCOP(plan.price)}</p>
                <p className="text-muted-foreground">Vigencia: {plan.durationDays} días</p>
              </div>
              {isEmpresa ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                  <PlanTeamFeaturesBlock plan={plan} compact />
                </div>
              ) : null}
              <WompiCheckoutButton planId={plan.id} label="Suscribirse" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
