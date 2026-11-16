import { Check, Minus } from "lucide-react";
import { resolvePlanHeaderColor } from "@piel360/shared";
import { formatCOP } from "@/components/payments/subscription-utils";
import { publicPlanFeatures, type PublicPlan } from "@/lib/public-plans";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../content/types";
import { LeadCta } from "../lead-cta";
import { btnPrimary, btnSecondary } from "../landing-ui";

type PricingCopy = LandingContent["pricing"];

export function PricingCard({
  plan,
  copy,
  popular,
  interest,
}: {
  plan: PublicPlan;
  copy: PricingCopy;
  popular: boolean;
  interest: "aesthetic" | "derm";
}) {
  const color = resolvePlanHeaderColor(plan.headerColor).hex;
  const features = publicPlanFeatures(plan);

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-[2rem] border bg-white p-6 sm:p-7",
        popular
          ? "landing-holo-border border-transparent shadow-[0_30px_80px_-30px_rgba(29,107,255,0.55)] lg:-translate-y-3"
          : "border-(--landing-line)",
      )}
    >
      {popular ? (
        <span className="absolute -top-3 left-6 rounded-full bg-(--landing-electric) px-3 py-1 text-xs font-bold text-white">
          {copy.popular}
        </span>
      ) : null}
      <div className="h-1.5 w-12 rounded-full" style={{ background: color }} aria-hidden />
      <h3 className="mt-4 text-xl font-extrabold text-(--landing-navy)">{plan.name}</h3>
      {plan.description ? <p className="mt-1 text-sm text-(--landing-muted)">{plan.description}</p> : null}

      <p className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tracking-tight text-(--landing-navy)">
          {formatCOP(plan.customerPrice)}
        </span>
        <span className="text-sm text-(--landing-muted)">{copy.perPeriod(plan.durationDays)}</span>
      </p>

      <ul className="mt-5 space-y-2 text-sm">
        <li className="flex gap-2 font-semibold text-(--landing-navy)">
          <Check className="size-5 shrink-0 text-(--landing-turquoise)" aria-hidden />
          {copy.analyses(plan.analysisLimit)}
        </li>
        <li className="flex gap-2 text-(--landing-ink)">
          <Check className="size-5 shrink-0 text-(--landing-turquoise)" aria-hidden />
          {copy.users(plan.maxUsers)}
        </li>
        {features.map((feature) => (
          <li
            key={feature.label}
            className={cn("flex gap-2", feature.included ? "text-(--landing-ink)" : "text-slate-400")}
          >
            {feature.included ? (
              <Check className="size-5 shrink-0 text-(--landing-turquoise)" aria-hidden />
            ) : (
              <Minus className="size-5 shrink-0" aria-hidden />
            )}
            <span>
              {feature.label}
              {feature.included ? null : <span className="sr-only"> (no incluido)</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2 pt-7">
        <LeadCta preset={{ interest, intent: "demo", planId: plan.id }} className={btnPrimary}>
          {copy.ctaBuy}
        </LeadCta>
        <LeadCta preset={{ interest, intent: "meeting", planId: plan.id }} className={btnSecondary}>
          {copy.ctaDemo}
        </LeadCta>
      </div>
    </article>
  );
}

export function CustomPlanCard({ copy, interest }: { copy: PricingCopy; interest: "aesthetic" | "derm" }) {
  return (
    <article className="flex h-full flex-col rounded-[2rem] bg-gradient-to-br from-[#0b2a52] to-[#1d6bff] p-6 text-white sm:p-7">
      <h3 className="text-xl font-extrabold text-white">{copy.custom.title}</h3>
      <p className="mt-3 text-sm text-blue-100">{copy.custom.text}</p>
      <div className="mt-auto pt-7">
        <LeadCta
          preset={{ interest, intent: "custom_plan" }}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-(--landing-navy) transition-transform hover:-translate-y-0.5"
        >
          {copy.custom.cta}
        </LeadCta>
      </div>
    </article>
  );
}
