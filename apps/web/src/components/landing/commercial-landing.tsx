import type { PublicPlan } from "@/lib/public-plans";
import type { LandingContent } from "./content/types";
import { LandingAnalytics } from "./landing-analytics";
import { LandingJsonLd } from "./landing-json-ld";
import { Benefits, UseCases } from "./sections/benefits";
import { DualValue } from "./sections/dual-value";
import { Hero } from "./sections/hero";
import { HowItWorks } from "./sections/how-it-works";
import { LandingFooter } from "./sections/landing-footer";
import { LandingHeader } from "./sections/landing-header";
import { LeadForm } from "./sections/lead-form";
import { Pricing } from "./sections/pricing";
import { AestheticModule, DermModule } from "./sections/service-modules";
import { Faq, Testimonials } from "./sections/testimonials-faq";
import { WhatIs } from "./sections/what-is";
import "./landing.css";

/** Landing comercial (ruta `/`): el orden de las secciones es el del brief. */
export function CommercialLanding({
  content,
  plans,
  siteUrl,
}: {
  content: LandingContent;
  plans: PublicPlan[];
  siteUrl: string;
}) {
  return (
    <div className="landing min-h-dvh w-full">
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-full bg-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <LandingHeader content={content.nav} />
      <main id="contenido">
        <Hero content={content.hero} />
        <DualValue content={content.dual} />
        <WhatIs content={content.whatIs} />
        <AestheticModule content={content.aesthetic} />
        <DermModule content={content.derm} />
        <HowItWorks content={content.steps} />
        <Benefits content={content.benefits} />
        <UseCases content={content.useCases} />
        <Pricing content={content.pricing} plans={plans} />
        <Testimonials content={content.testimonials} />
        <Faq content={content.faq} />
        <LeadForm content={content.form} plans={plans.map(({ id, name }) => ({ id, name }))} />
      </main>
      <LandingFooter content={content.footer} />
      <LandingJsonLd content={content} siteUrl={siteUrl} />
      <LandingAnalytics />
    </div>
  );
}
