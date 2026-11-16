import { Check, Minus } from "lucide-react";
import { plansForTab, publicPlanFeatures, type PublicPlan } from "@/lib/public-plans";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../content/types";
import { LeadCta } from "../lead-cta";
import { SectionHeading, btnPrimary, sectionWrap } from "../landing-ui";
import { CustomPlanCard, PricingCard } from "./pricing-card";
import { PricingTabs, type PricingTab } from "./pricing-tabs";

/** Con tres planes o más se destaca el del medio, como en las tablas de
 * precios habituales. El catálogo no guarda cuál es el «más vendido». */
const featuredIndex = (count: number) => (count >= 3 ? Math.floor(count / 2) : -1);

function FeatureComparison({ plans, title }: { plans: PublicPlan[]; title: string }) {
  const labels = [...new Set(plans.flatMap((plan) => publicPlanFeatures(plan).map((f) => f.label)))];
  if (plans.length < 2 || labels.length === 0) return null;

  return (
    <div className="mt-12 overflow-x-auto rounded-3xl border border-(--landing-line) bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="px-5 pt-5 text-left text-base font-bold text-(--landing-navy)">{title}</caption>
        <thead>
          <tr className="border-b border-(--landing-line)">
            <th scope="col" className="px-5 py-3 text-left">
              <span className="sr-only">Funcionalidad</span>
            </th>
            {plans.map((plan) => (
              <th key={plan.id} scope="col" className="px-4 py-3 text-center font-semibold text-(--landing-navy)">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => (
            <tr key={label} className="border-b border-(--landing-line) last:border-0">
              <th scope="row" className="px-5 py-3 text-left font-medium text-(--landing-ink)">
                {label}
              </th>
              {plans.map((plan) => {
                const included = publicPlanFeatures(plan).some((f) => f.label === label && f.included);
                return (
                  <td key={plan.id} className="px-4 py-3 text-center">
                    {included ? (
                      <Check className="mx-auto size-5 text-(--landing-turquoise)" aria-label="Incluido" />
                    ) : (
                      <Minus className="mx-auto size-5 text-slate-300" aria-label="No incluido" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabPanel({ plans, tab, content }: { plans: PublicPlan[]; tab: PricingTab; content: LandingContent["pricing"] }) {
  const visible = plansForTab(plans, tab);
  const featured = featuredIndex(visible.length);

  return (
    <>
      {visible.length === 0 ? (
        <div className="mx-auto max-w-lg rounded-3xl border border-(--landing-line) bg-white p-8 text-center">
          <p className="text-(--landing-muted)">{content.empty}</p>
          <LeadCta preset={{ interest: tab, intent: "custom_plan" }} className={cn(btnPrimary, "mt-5")}>
            {content.custom.cta}
          </LeadCta>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((plan, i) => (
            <PricingCard key={plan.id} plan={plan} copy={content} popular={i === featured} interest={tab} />
          ))}
          <CustomPlanCard copy={content} interest={tab} />
        </div>
      )}
      <FeatureComparison plans={visible} title={content.compareTitle} />
    </>
  );
}

export function Pricing({ content, plans }: { content: LandingContent["pricing"]; plans: PublicPlan[] }) {
  return (
    <section id="planes" className="scroll-mt-20 bg-(--landing-mist) py-16 sm:py-24">
      <div className={sectionWrap}>
        <SectionHeading kicker={content.kicker} title={content.title} text={content.text} />
        <PricingTabs
          label={content.kicker}
          labels={content.tabs}
          panels={{
            aesthetic: <TabPanel plans={plans} tab="aesthetic" content={content} />,
            derm: <TabPanel plans={plans} tab="derm" content={content} />,
          }}
        />
        <p className="mt-6 text-center text-xs text-(--landing-muted)">{content.taxNote}</p>
      </div>
    </section>
  );
}
