import { ArrowRight } from "lucide-react";
import type { LandingContent } from "../content/types";
import { LeadCta, type LeadPreset } from "../lead-cta";
import { Reveal } from "../reveal";
import { sectionWrap } from "../landing-ui";
import { BodyMap } from "../visuals/body-map";
import { FaceHeatmap } from "../visuals/face-heatmap";

type Block = LandingContent["dual"]["aesthetic"];

function ServiceBlock({
  block,
  preset,
  accent,
  visual,
  delay,
}: {
  block: Block;
  preset: LeadPreset;
  accent: string;
  visual: React.ReactNode;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <article
        className="landing-holo-border group relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-[#07182f] p-6 text-white shadow-2xl sm:p-8"
        style={{ "--accent": accent } as React.CSSProperties}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-40 blur-3xl transition-opacity group-hover:opacity-70"
          style={{ background: accent }}
          aria-hidden
        />
        <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: accent }}>
          {block.kicker}
        </p>
        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{block.title}</h3>
        <p className="mt-3 max-w-md text-slate-300">{block.text}</p>
        <div className="my-6 flex-1">{visual}</div>
        <LeadCta
          preset={preset}
          className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-(--accent) px-6 text-sm font-semibold text-[#07182f] transition-transform hover:-translate-y-0.5"
        >
          {block.cta}
          <ArrowRight className="size-4" aria-hidden />
        </LeadCta>
      </article>
    </Reveal>
  );
}

export function DualValue({ content }: { content: LandingContent["dual"] }) {
  return (
    <section id="servicios" className="relative -mt-8 scroll-mt-20 py-16 sm:py-20">
      <div className={`${sectionWrap} grid gap-6 lg:grid-cols-2`}>
        <ServiceBlock
          block={content.aesthetic}
          preset={{ interest: "aesthetic", intent: "demo" }}
          accent="#2dd4bf"
          delay={0}
          visual={<FaceHeatmap className="mx-auto aspect-4/3 w-full max-w-md" />}
        />
        <ServiceBlock
          block={content.derm}
          preset={{ interest: "derm", intent: "demo" }}
          accent="#60a5fa"
          delay={120}
          visual={<BodyMap className="mx-auto aspect-4/3 w-full max-w-md" />}
        />
      </div>
    </section>
  );
}
