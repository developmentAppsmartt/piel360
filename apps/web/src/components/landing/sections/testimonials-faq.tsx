import { ChevronDown, Quote } from "lucide-react";
import type { LandingContent } from "../content/types";
import { Reveal } from "../reveal";
import { PendingBadge, SectionHeading, sectionWrap } from "../landing-ui";

/** Casos de éxito. Mientras el cliente no entregue testimonios reales, cada
 * tarjeta lleva la marca «Ejemplo»: no se publica un testimonio inventado. */
export function Testimonials({ content }: { content: LandingContent["testimonials"] }) {
  return (
    <section className="py-16 sm:py-24">
      <div className={sectionWrap}>
        <SectionHeading kicker={content.kicker} title={content.title} />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {content.items.map((item, i) => (
            <Reveal key={i} delay={i * 90}>
              <figure className="flex h-full flex-col rounded-3xl border border-dashed border-amber-300 bg-white p-6">
                <div className="flex items-center justify-between">
                  <Quote className="size-7 text-(--landing-electric)" aria-hidden />
                  <PendingBadge>{content.sampleBadge}</PendingBadge>
                </div>
                <p className="mt-4 text-2xl font-extrabold text-(--landing-navy)">{item.result}</p>
                <blockquote className="mt-3 flex-1 text-(--landing-muted)">{item.quote}</blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-semibold text-(--landing-navy)">{item.name}</span>
                  <span className="block text-(--landing-muted)">{item.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Preguntas en `<details>`: accesibles con teclado y sin JS. Las mismas
 * alimentan el JSON-LD `FAQPage` (landing-json-ld.tsx). */
export function Faq({ content }: { content: LandingContent["faq"] }) {
  return (
    <section id="preguntas" className="scroll-mt-20 bg-(--landing-mist) py-16 sm:py-24">
      <div className={`${sectionWrap} max-w-3xl`}>
        <SectionHeading kicker={content.kicker} title={content.title} />
        <div className="mt-10 space-y-3">
          {content.items.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-(--landing-line) bg-white open:shadow-[0_16px_40px_-24px_rgba(29,107,255,0.5)]"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-(--landing-navy) [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="px-5 pb-5 text-(--landing-muted)">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
