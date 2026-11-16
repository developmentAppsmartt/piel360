import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

/** Piezas que se repiten en todas las secciones de la landing. */

export const btnPrimary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-(--landing-electric) px-6 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(29,107,255,0.7)] transition-transform hover:-translate-y-0.5 hover:bg-[#1659d6]";

export const btnSecondary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-(--landing-line) bg-white/80 px-6 text-sm font-semibold text-(--landing-navy) backdrop-blur transition-transform hover:-translate-y-0.5 hover:border-(--landing-medical)";

export const sectionWrap = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

export function SectionHeading({
  kicker,
  title,
  text,
  align = "center",
  tone = "light",
}: {
  kicker: string;
  title: ReactNode;
  text?: string;
  align?: "center" | "left";
  tone?: "light" | "dark";
}) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p
        className={cn(
          "text-xs font-bold tracking-[0.2em] uppercase",
          tone === "dark" ? "text-[#7dd3fc]" : "text-(--landing-turquoise-ink)",
        )}
      >
        {kicker}
      </p>
      <h2
        className={cn(
          "mt-3 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl",
          tone === "dark" ? "text-white" : "text-(--landing-navy)",
        )}
      >
        {title}
      </h2>
      {text ? (
        <p
          className={cn(
            "mt-4 text-base text-pretty sm:text-lg",
            tone === "dark" ? "text-slate-300" : "text-(--landing-muted)",
          )}
        >
          {text}
        </p>
      ) : null}
    </Reveal>
  );
}

/** Marca de contenido que el cliente todavía no entrega. */
export function PendingBadge({ children }: { children: ReactNode }) {
  return (
    <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
      {children}
    </span>
  );
}
