"use client";

import { useMemo, useState } from "react";
import { Check, Microscope, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WompiCheckoutButton } from "@/components/payments/wompi-checkout-button";
import { PlanCoverageIconButton } from "@/components/payments/plan-coverage-modal";
import { formatCOP, providerLabel } from "@/components/payments/subscription-utils";
import type { Plan, PlanFeature } from "@piel360/shared";
import {
  PROVIDER_PUBLIC_ALIASES,
  providerSlugMatches,
  resolvePlanHeaderColor,
} from "@piel360/shared";
import { useMyDoctorProfile, isEnterpriseDoctor } from "@/lib/queries/doctors";
import { usePlans } from "@/lib/queries/plans";
import { useMySubscriptions } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";

const PROVIDER_ORDER = [
  PROVIDER_PUBLIC_ALIASES.youcam,
  PROVIDER_PUBLIC_ALIASES.skiniver,
  "fitzpatrick",
] as const;

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

function planVariant(plan: Plan): "aesthetic" | "dermatology" | "mixed" {
  const slugs = planProviderSlugs(plan);
  const hasYoucam = slugs.some((slug) =>
    providerSlugMatches(slug, ["youcam", "fitzpatrick"]),
  );
  const hasSkiniver = slugs.some((slug) =>
    providerSlugMatches(slug, ["skiniver"]),
  );
  if (hasSkiniver && !hasYoucam) return "dermatology";
  if (hasYoucam && !hasSkiniver) return "aesthetic";
  return "mixed";
}

/** Mezcla un hex con blanco (0 = original, 1 = blanco). */
function mixWithWhite(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const mix = (channel: string) => {
    const n = Number.parseInt(channel, 16);
    return Math.round(n + (255 - n) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${mix(raw.slice(0, 2))}${mix(raw.slice(2, 4))}${mix(raw.slice(4, 6))}`;
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
  const accent = header.hex;
  const accentSoft = mixWithWhite(accent, 0.88);
  const accentMid = mixWithWhite(accent, 0.55);
  const canPurchase = plan.poolPurchasable !== false;
  const features = planFeatures(plan).filter((f) => f.included);
  const variant = planVariant(plan);
  const isDerm = variant === "dermatology";
  const BadgeIcon = isDerm ? Microscope : ScanFace;
  const badgeLabel = isDerm
    ? "Análisis de apoyo diagnóstico"
    : "Análisis Estético de Piel";

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-white text-center shadow-sm transition-shadow",
        featured ? "shadow-[0_20px_50px_-28px_rgba(15,40,80,0.45)]" : "hover:shadow-md",
      )}
      style={{
        borderColor: featured ? accent : mixWithWhite(accent, 0.72),
        borderWidth: featured ? 2 : 1,
        boxShadow: featured
          ? `0 20px 50px -28px ${accent}99`
          : undefined,
      }}
    >
      {/* Franja de color sin imagen de fondo */}
      <div
        className="relative h-16 w-full"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, ${accentMid} 55%, ${accentSoft} 100%)`,
        }}
      >
        {featured ? (
          <span
            className="absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase shadow-sm"
            style={{
              background: `linear-gradient(90deg, ${accent} 0%, ${mixWithWhite(accent, 0.25)} 100%)`,
            }}
          >
            Más popular
          </span>
        ) : null}
        <div className="absolute bottom-0 left-5 translate-y-1/2">
          <PlanCoverageIconButton plan={plan} accentHex={accent} />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-5 px-6 pt-10 pb-7 sm:px-8">
        <div className="space-y-2">
          <h3
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: accent }}
          >
            {plan.name}
          </h3>
          {plan.description ? (
            <p
              className="mx-auto max-w-[18rem] text-sm font-medium leading-relaxed"
              style={{ color: mixWithWhite(accent, 0.35) }}
            >
              {plan.description}
            </p>
          ) : null}
        </div>

        <div className="w-full space-y-1.5 py-1">
          <p
            className="text-4xl font-bold tracking-tight"
            style={{ color: accent }}
          >
            {formatCOP(plan.customerPrice ?? plan.price)}
          </p>
          <p
            className="text-sm font-semibold"
            style={{ color: mixWithWhite(accent, 0.3) }}
          >
            Vigencia: {plan.durationDays} días
          </p>
          <p
            className="text-sm font-semibold"
            style={{ color: mixWithWhite(accent, 0.3) }}
          >
            {plan.analysisLimit} análisis incluidos
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ backgroundColor: accentSoft, color: accent }}
        >
          <BadgeIcon className="size-3.5" />
          {badgeLabel}
        </div>

        {!canPurchase ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Temporalmente no disponible. Contáctanos para más información.
          </p>
        ) : null}

        {features.length > 0 ? (
          <ul className="w-full max-w-xs space-y-2.5 text-left">
            {features.map((feature, index) => (
              <li
                key={`${feature.label}-${index}`}
                className="flex items-start gap-2.5 text-sm leading-snug text-foreground"
              >
                <span
                  className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                >
                  <Check className="size-3 stroke-[3]" />
                </span>
                <span className="font-medium">{feature.label}</span>
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
              label={featured ? `Elegir ${plan.name}` : "Seleccionar plan"}
              className="h-11 w-full rounded-full font-semibold text-white shadow-none hover:opacity-90"
              style={{ backgroundColor: accent }}
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

  const providerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const plan of catalog) {
      for (const slug of planProviderSlugs(plan)) set.add(slug);
    }
    return sortProviderSlugs([...set]);
  }, [catalog]);

  const filtered = useMemo(() => {
    if (!providerSlug) return catalog;
    return catalog.filter((p) =>
      planProviderSlugs(p).some((slug) =>
        providerSlugMatches(slug, [providerSlug]),
      ),
    );
  }, [catalog, providerSlug]);

  const active = subscriptions.data?.filter((s) => s.status === "active") ?? [];

  return (
    <div className="space-y-8">
      {!hideActiveSection && active.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Tu plan activo</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((sub) => (
              <div
                key={sub.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <p className="font-semibold">{sub.plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {providerLabel(sub.plan.provider.slug)}
                  {/* `endsAt` es nullable: sin fecha no se anuncia vigencia. */}
                  {sub.endsAt
                    ? ` · vigente hasta ${new Date(sub.endsAt).toLocaleDateString("es-CO")}`
                    : null}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="space-y-3 text-center">
          <div>
            <h2 className="text-lg font-semibold">Catálogo de planes</h2>
            <p className="text-sm text-muted-foreground">
              Elige el plan que mejor se adapte a tu práctica.
            </p>
          </div>
          {providerOptions.length > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setProviderSlug(null)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  providerSlug == null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                Todos
              </button>
              {providerOptions.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setProviderSlug(slug)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    providerSlug === slug
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {providerLabel(slug)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {plans.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando planes…</p>
        ) : null}
        {plans.isError ? (
          <p className="text-sm text-destructive">No se pudieron cargar los planes.</p>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((plan, index) => (
            <PlanPricingCard
              key={plan.id}
              plan={plan}
              isEmpresa={isEmpresa}
              featured={index === 1 && filtered.length >= 3}
            />
          ))}
        </div>

        {!plans.isLoading && filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No hay planes disponibles para este filtro.
          </p>
        ) : null}
      </section>
    </div>
  );
}
