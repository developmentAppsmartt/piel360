import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Cabecera de pantalla del panel con el estilo de la landing: ícono, título,
 * subtítulo y acciones. `image` pinta a la derecha el rostro con malla del
 * banner (se oculta en pantallas angostas). `tone="brand"` es la versión en
 * degradado azul de los encabezados de análisis y reporte.
 */
export function PageBanner({
  icon: Icon,
  title,
  subtitle,
  actions,
  aside,
  image = false,
  tone = "light",
  headingLevel = "h1",
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Algo junto al título (p. ej. el chip de la fecha). */
  aside?: ReactNode;
  image?: boolean;
  tone?: "light" | "brand";
  headingLevel?: "h1" | "h2";
  className?: string;
}) {
  const brand = tone === "brand";
  const Heading = headingLevel;

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border p-4 sm:p-5",
        brand
          ? "border-transparent bg-gradient-to-r from-[#0f3d73] via-[#1e5a9e] to-[#2f86d6] text-white shadow-[0_16px_40px_-20px_rgba(30,90,158,0.8)]"
          : "border-border/80 bg-gradient-to-r from-card via-card to-sky-50 dark:to-sky-950/30",
        className,
      )}
    >
      {image ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[38%] md:block" aria-hidden>
          <Image
            src="/landing/rostro-malla.webp"
            alt=""
            fill
            sizes="380px"
            className="object-cover object-[60%_30%] opacity-90"
          />
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-r",
              brand ? "from-[#1e5a9e] via-[#1e5a9e]/40 to-transparent" : "from-card via-card/60 to-transparent",
            )}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl sm:size-14",
              brand ? "bg-white/15 text-white ring-1 ring-white/30" : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-6 sm:size-7" aria-hidden />
          </span>
          <div className="min-w-0">
            <Heading
              className={cn(
                "text-xl font-bold tracking-tight sm:text-2xl",
                brand ? "text-white" : "text-foreground",
              )}
            >
              {title}
            </Heading>
            {subtitle ? (
              <p className={cn("mt-0.5 text-sm", brand ? "text-blue-100" : "text-muted-foreground")}>{subtitle}</p>
            ) : null}
          </div>
          {aside ? <div className="hidden shrink-0 lg:block">{aside}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {aside ? <div className="mt-3 lg:hidden">{aside}</div> : null}
    </section>
  );
}

/** Chip blanco para fechas o datos cortos dentro de un `PageBanner`. */
export function BannerChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-[#0f3d73] shadow-sm">
      <Icon className="size-4 text-[#1e5a9e]" aria-hidden />
      {children}
    </span>
  );
}
