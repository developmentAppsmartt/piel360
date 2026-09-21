"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WompiCheckoutButton } from "@/components/payments/wompi-checkout-button";
import { formatCOP, providerLabel } from "@/components/payments/subscription-utils";
import type { Plan, PlanFeature } from "@piel360/shared";
import { resolvePlanHeaderColor } from "@piel360/shared";
import { useMyDoctorProfile, isEnterpriseDoctor } from "@/lib/queries/doctors";
import { usePlans } from "@/lib/queries/plans";
import { useMySubscriptions } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";

const PROVIDER_ORDER = ["youcam", "skiniver", "fitzpatrick"] as const;

function planProviderSlugs(plan: Plan): string[] {
  if (plan.providers?.length) return plan.providers.map((p) => p.slug);
  return [plan.provider.slug];
}

function planFeatures(plan: Plan): PlanFeature[] {
  if (!Array.isArray(plan.features)) return [];
  return plan.features.filter((f) => f?.label?.trim());
}

function sortProviderSlugs(slugs: string[]): string[] {
  return [...slugs].sort((a, b) => {
    const ia = PROVIDER_ORDER.indexOf(a as (typeof PROVIDER_ORDER)[number]);
    const ib = PROVIDER_ORDER.indexOf(b as (typeof PROVIDER_ORDER)[number]);
    const sa = ia === -1 ? 99 : ia;
    const sb = ib === -1 ? 99 : ib;
    return sa - sb || a.localeCompare(b);
  });
}

function PlanPricingCard({
  plan,
  isEmpresa,
  featured = false,
}: {
  plan: Plan;
  isEmpresa: boolean;
  featured?: boolean;
}) {
  const header = resolvePlanHeaderColor(plan.headerColor);
  const canPurchase = plan.poolPurchasable !== false;
  const features = planFeatures(plan);

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-white text-center shadow-sm transition-shadow",
        featured
          ? "border-primary/40 shadow-[0_20px_50px_-28px_rgba(30,90,158,0.55)] ring-2 ring-primary/20"
          : "border-border/80 hover:shadow-md",
      )}
    >
      {featured ? (
        <span className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#1e5a9e] to-[#3b82c4] px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
          Más popular
        </span>
      ) : null}

      <div
        className={cn("h-1.5 w-full", featured && "mt-8")}
        style={{ backgroundColor: header.hex }}
        aria-hidden
      />

      <div className="flex flex-1 flex-col items-center gap-6 px-6 pt-7 pb-7 sm:px-8">
        <div className="space-y-2">
          <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {plan.name}
          </h3>
          {plan.description ? (
            <p className="mx-auto max-w-[18rem] text-sm font-medium leading-relaxed text-muted-foreground">
              {plan.description}
            </p>
          ) : null}
        </div>

        <div className="w-full space-y-2 py-2">
          <p className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {formatCOP(plan.price)}
          </p>
          <p className="text-sm font-semibold text-foreground">
            Vigencia: {plan.durationDays} días
          </p>
          <p className="text-sm font-semibold text-foreground">
            {plan.analysisLimit} análisis incluidos
          </p>
        </div>

        {!canPurchase ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Temporalmente no disponible. Contáctanos para más información.
          </p>
        ) : null}

        {features.length > 0 ? (
          <ul className="w-full max-w-xs space-y-3 text-left">
            {features.map((feature, index) => (
              <li
                key={`${feature.label}-${index}`}
                className="flex items-start gap-2.5 text-sm leading-snug"
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-white",
                    feature.included ? "bg-teal-500" : "bg-rose-500",
                  )}
                  aria-hidden
                >
                  {feature.included ? (
                    <Check className="size-3 stroke-[3]" />
                  ) : (
                    <X className="size-3 stroke-[3]" />
                  )}
                </span>
                <span
                  className={cn(
                    feature.included
                      ? "font-medium text-foreground"
                      : "text-muted-foreground line-through",
                  )}
                >
                  {feature.label}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {isEmpresa ? (
          <p className="rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Hasta {plan.maxUsers} usuario{plan.maxUsers === 1 ? "" : "s"} en el
            equipo
          </p>
        ) : null}

        <div className="mt-auto w-full pt-2">
          {canPurchase ? (
            <WompiCheckoutButton
              planId={plan.id}
              label={featured ? `Elegir ${plan.name}` : "Suscribirse"}
              className={cn(
                "h-11 w-full rounded-full font-semibold shadow-none",
                featured
                  ? "bg-gradient-to-r from-[#1e5a9e] to-[#3b82c4] text-white hover:from-[#174a85] hover:to-[#1e5a9e]"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            />
          ) : (
            <Button type="button" disabled className="h-11 w-full rounded-full">
              No disponible
            </Button>
          )}
        </div>
      </div>
    </article>
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

  const catalog = useMemo(() => {
    return (
      plans.data?.filter((p) => {
        if (planTypeFilter && (p.planType ?? "business") !== planTypeFilter) {
          return false;
        }
        return true;
      }) ?? []
    );
  }, [plans.data, planTypeFilter]);

  const providers = useMemo(() => {
    const slugs = new Set(catalog.flatMap((p) => planProviderSlugs(p)));
    let list = Array.from(slugs);
    const allowed = doctorProfile.data?.allowedProviderSlugs;
    if (allowed) list = list.filter((slug) => allowed.includes(slug));
    return sortProviderSlugs(list);
  }, [catalog, doctorProfile.data?.allowedProviderSlugs]);

  const activeProvider = providerSlug ?? providers[0] ?? null;

  const visiblePlans = useMemo(() => {
    if (!activeProvider) return [];
    return catalog
      .filter((p) => planProviderSlugs(p).includes(activeProvider))
      .slice()
      .sort(
        (a, b) =>
          Number(a.price) - Number(b.price) ||
          Number(b.poolPurchasable) - Number(a.poolPurchasable),
      );
  }, [catalog, activeProvider]);

  const featuredPlanId = useMemo(() => {
    if (visiblePlans.length < 2) return null;
    const mid = Math.floor((visiblePlans.length - 1) / 2);
    return visiblePlans[Math.max(1, mid)]?.id ?? visiblePlans[1]?.id ?? null;
  }, [visiblePlans]);

  const activeSubscriptions =
    subscriptions.data?.filter((s) => s.status === "active") ?? [];

  return (
    <div className="space-y-8">
      {!hideActiveSection && activeSubscriptions.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium">Suscripciones activas</h2>
          <ul className="space-y-2 text-sm">
            {activeSubscriptions.map((sub) => (
              <li
                key={sub.id}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  {providerLabel(sub.plan.provider.slug, sub.plan.provider.name)}{" "}
                  — {sub.plan.name}
                </span>
                <span className="text-muted-foreground">
                  {sub.remainingCredits} créditos · vence{" "}
                  {sub.endsAt
                    ? new Date(sub.endsAt).toLocaleDateString("es-CO")
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plans.isLoading && (
        <p className="text-muted-foreground">Cargando planes...</p>
      )}

      {!plans.isLoading && providers.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
          Tu especialidad no tiene tipos de análisis habilitados. Contacta al
          administrador para activarlos en permisos de planes.
        </p>
      )}

      {providers.length > 0 ? (
        <div className="flex justify-center px-1">
          <div className="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-full border border-border/70 bg-muted/40 p-1.5 shadow-sm">
            {providers.map((slug) => {
              const active = activeProvider === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setProviderSlug(slug)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-5",
                    active
                      ? "bg-gradient-to-r from-[#1e5a9e] to-[#3b82c4] text-white shadow-sm"
                      : "text-muted-foreground hover:bg-white hover:text-foreground",
                  )}
                >
                  {providerLabel(slug)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!plans.isLoading &&
        providers.length > 0 &&
        visiblePlans.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-white p-4 text-center text-sm text-muted-foreground">
            No hay planes disponibles para este tipo de análisis.
          </p>
        )}

      {visiblePlans.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-7">
          {visiblePlans.map((plan) => (
            <PlanPricingCard
              key={plan.id}
              plan={plan}
              isEmpresa={isEmpresa}
              featured={plan.id === featuredPlanId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
