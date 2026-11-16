import { BrainCircuit, Camera, ClipboardList, Sparkles, Timer } from "lucide-react";
import type { LandingContent } from "../content/types";
import { Reveal } from "../reveal";
import { SectionHeading, sectionWrap } from "../landing-ui";

const STEP_ICONS = [Camera, BrainCircuit, Timer, ClipboardList, Sparkles];

/** Línea de tiempo de 5 pasos: la barra se llena al entrar en pantalla
 * (`landing-timeline-fill`, horizontal en escritorio y vertical en móvil). */
export function HowItWorks({ content }: { content: LandingContent["steps"] }) {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-(--landing-mist) py-16 sm:py-24">
      <div className={sectionWrap}>
        <SectionHeading kicker={content.kicker} title={content.title} />
        <Reveal className="relative mt-14">
          <div className="absolute top-0 bottom-0 left-6 w-1 rounded-full bg-(--landing-line) md:top-6 md:right-[10%] md:bottom-auto md:left-[10%] md:h-1 md:w-auto" aria-hidden>
            <div className="landing-timeline-fill size-full rounded-full bg-gradient-to-b from-[#1d6bff] to-[#0fb5ba] md:bg-gradient-to-r" />
          </div>
          <ol className="relative grid gap-8 md:grid-cols-5 md:gap-4">
            {content.items.map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              return (
                <li key={step.title} className="flex gap-4 md:flex-col md:items-center md:text-center">
                  <span className="relative inline-flex size-13 shrink-0 items-center justify-center rounded-2xl bg-white text-(--landing-electric) shadow-[0_10px_30px_-12px_rgba(29,107,255,0.6)] ring-4 ring-(--landing-mist)">
                    <Icon className="size-6" aria-hidden />
                    <span className="absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full bg-(--landing-navy) text-xs font-bold text-white">
                      {i + 1}
                    </span>
                  </span>
                  <div>
                    <h3 className="font-bold text-(--landing-navy) md:mt-4">{step.title}</h3>
                    <p className="mt-1 text-sm text-(--landing-muted)">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
