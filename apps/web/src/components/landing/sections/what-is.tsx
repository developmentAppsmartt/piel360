import { BrainCircuit, Eye, LayoutDashboard, Smartphone } from "lucide-react";
import type { LandingContent } from "../content/types";
import { Reveal } from "../reveal";
import { SectionHeading, sectionWrap } from "../landing-ui";

const PILLAR_ICONS = [Eye, BrainCircuit, LayoutDashboard, Smartphone];

export function WhatIs({ content }: { content: LandingContent["whatIs"] }) {
  return (
    <section className="py-16 sm:py-24">
      <div className={sectionWrap}>
        <SectionHeading kicker={content.kicker} title={content.title} text={content.text} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {content.pillars.map((pillar, i) => {
            const Icon = PILLAR_ICONS[i % PILLAR_ICONS.length];
            return (
              <Reveal key={pillar.title} delay={i * 90}>
                <article className="h-full rounded-3xl border border-(--landing-line) bg-(--landing-mist) p-6 transition-transform hover:-translate-y-1">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-(--landing-electric) shadow-sm">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-(--landing-navy)">{pillar.title}</h3>
                  <p className="mt-1 text-sm text-(--landing-muted)">{pillar.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
