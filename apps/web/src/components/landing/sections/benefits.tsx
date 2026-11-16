import {
  Bell,
  BrainCircuit,
  Building2,
  FolderHeart,
  GitCompareArrows,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  Leaf,
  MapPin,
  MonitorSmartphone,
  Repeat,
  Scissors,
  Sparkles,
  Stethoscope,
  Video,
  Wand2,
  Zap,
} from "lucide-react";
import type { LandingContent } from "../content/types";
import { Reveal } from "../reveal";
import { SectionHeading, sectionWrap } from "../landing-ui";

const BENEFIT_ICONS = [
  Zap,
  BrainCircuit,
  FolderHeart,
  LayoutDashboard,
  GitCompareArrows,
  Video,
  Repeat,
  MapPin,
  Bell,
  Wand2,
];

const USE_CASE_ICONS = [Stethoscope, Hospital, Building2, Sparkles, Scissors, HeartPulse, Leaf, MonitorSmartphone];

export function Benefits({ content }: { content: LandingContent["benefits"] }) {
  return (
    <section className="py-16 sm:py-24">
      <div className={sectionWrap}>
        <SectionHeading kicker={content.kicker} title={content.title} />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {content.items.map((item, i) => {
            const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
            return (
              <Reveal key={item.title} delay={(i % 5) * 70}>
                <article className="group h-full rounded-3xl border border-(--landing-line) bg-white p-5 transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_20px_50px_-25px_rgba(29,107,255,0.55)]">
                  <Icon className="size-7 text-(--landing-electric) transition-colors group-hover:text-(--landing-turquoise)" aria-hidden />
                  <h3 className="mt-4 font-bold text-(--landing-navy)">{item.title}</h3>
                  <p className="mt-1 text-sm text-(--landing-muted)">{item.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function UseCases({ content }: { content: LandingContent["useCases"] }) {
  return (
    <section className="bg-gradient-to-br from-[#0b2a52] via-[#0e3a72] to-[#0b6f8a] py-16 text-white sm:py-24">
      <div className={sectionWrap}>
        <SectionHeading tone="dark" kicker={content.kicker} title={content.title} />
        <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {content.items.map((item, i) => {
            const Icon = USE_CASE_ICONS[i % USE_CASE_ICONS.length];
            return (
              <Reveal as="li" key={item} delay={(i % 4) * 70}>
                <div className="flex h-full flex-col items-center gap-3 rounded-3xl border border-white/15 bg-white/5 p-5 text-center backdrop-blur transition-colors hover:bg-white/10">
                  <Icon className="size-7 text-[#7dd3fc]" aria-hidden />
                  <span className="font-semibold">{item}</span>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
