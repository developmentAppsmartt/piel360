import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { LandingContent } from "../content/types";
import { LeadCta } from "../lead-cta";
import { btnPrimary, btnSecondary } from "../landing-ui";
import { VideoButton } from "../video-button";
import { HeroVisual } from "../visuals/hero-visual";

export function Hero({ content }: { content: LandingContent["hero"] }) {
  return (
    <section className="relative isolate flex min-h-dvh items-center overflow-hidden pt-24 pb-16 lg:pt-28">
      {/* Fondo: las ondas del banner. El rostro va dentro del escáner. */}
      <Image
        src="/landing/hero-banner.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-left"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/30 via-white/10 to-white" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-semibold text-(--landing-medical) backdrop-blur">
            <span className="size-2 rounded-full bg-(--landing-turquoise)" aria-hidden />
            {content.eyebrow}
          </p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-(--landing-navy) sm:text-5xl lg:text-6xl">
            {content.title}
          </h1>
          <p className="mt-6 max-w-xl text-base text-pretty text-(--landing-muted) sm:text-lg">
            {content.subtitle}
          </p>
          <p className="landing-holo-text mt-4 text-lg font-bold">{content.tagline}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <LeadCta preset={{ intent: "demo" }} className={btnPrimary}>
              {content.ctaDemo}
              <ArrowRight className="size-4" aria-hidden />
            </LeadCta>
            <VideoButton label={content.ctaVideo} pendingText={content.videoPending} className={btnSecondary} />
            <a href="#planes" className={btnSecondary}>
              {content.ctaPlans}
            </a>
          </div>

          <ul className="mt-10 grid max-w-lg grid-cols-3 gap-4">
            {content.stats.map((stat) => (
              <li key={stat.label} className="border-l-2 border-(--landing-turquoise) pl-3">
                <p className="text-xl font-extrabold text-(--landing-navy) sm:text-2xl">{stat.value}</p>
                <p className="text-xs text-(--landing-muted)">{stat.label}</p>
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}
