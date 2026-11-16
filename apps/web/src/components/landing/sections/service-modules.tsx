import { Check, ShieldCheck } from "lucide-react";
import type { LandingContent } from "../content/types";
import { Reveal } from "../reveal";
import { SectionHeading, sectionWrap } from "../landing-ui";
import { BodyMap } from "../visuals/body-map";
import { FaceHeatmap } from "../visuals/face-heatmap";

/** Módulo 1: los 15 parámetros y el mapa de calor. */
export function AestheticModule({ content }: { content: LandingContent["aesthetic"] }) {
  return (
    <section className="py-16 sm:py-24">
      <div className={`${sectionWrap} grid items-center gap-12 lg:grid-cols-2`}>
        <div>
          <SectionHeading align="left" kicker={content.kicker} title={content.title} text={content.text} />
          <Reveal delay={120}>
            <ul className="mt-8 flex flex-wrap gap-2">
              {content.parameters.map((parameter) => (
                <li
                  key={parameter}
                  className="rounded-full border border-[#99e6e8] bg-[#ecfeff] px-3.5 py-1.5 text-sm font-medium text-(--landing-turquoise-ink)"
                >
                  {parameter}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-(--landing-muted)">{content.note}</p>
          </Reveal>
        </div>
        <Reveal delay={160}>
          <FaceHeatmap labelled className="mx-auto aspect-4/5 w-full max-w-md shadow-2xl" />
        </Reveal>
      </div>
    </section>
  );
}

/** Módulo 2: capacidades y el mapa corporal. Fondo oscuro para el contraste
 * entre los dos servicios. */
export function DermModule({ content }: { content: LandingContent["derm"] }) {
  return (
    <section className="bg-[#07182f] py-16 text-white sm:py-24">
      <div className={`${sectionWrap} grid items-center gap-12 lg:grid-cols-2`}>
        <Reveal className="order-last lg:order-first">
          <BodyMap className="mx-auto aspect-square w-full max-w-md" />
        </Reveal>
        <div>
          <SectionHeading align="left" tone="dark" kicker={content.kicker} title={content.title} text={content.text} />
          <Reveal delay={120}>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {content.capabilities.map((capability) => (
                <li key={capability} className="flex items-start gap-2 text-slate-200">
                  <Check className="mt-0.5 size-5 shrink-0 text-[#60a5fa]" aria-hidden />
                  {capability}
                </li>
              ))}
            </ul>
            <p className="mt-8 flex items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-slate-200">
              <ShieldCheck className="size-5 shrink-0 text-[#2dd4bf]" aria-hidden />
              {content.disclaimer}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
