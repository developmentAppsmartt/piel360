"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWatermark } from "@/components/analyses/image-watermark";
import { ModuleCard } from "@/components/ui/module-card";
import { analisisPiel360SkinTypeLabel } from "@/lib/youcam-metric-labels";
import { cn } from "@/lib/utils";
import type { MetricRegionOption } from "./analisis-piel360-chips";

/** Tarjetas de zona: la miniatura es la foto base con la máscara de ESA zona
 * encima, igual que el visor grande. Sin la foto base (análisis sin original)
 * se muestra la máscara sola, que es lo único que hay. */
export function RegionCarousel({
  options,
  selectedRegion,
  onSelect,
  title,
  baseImageUrl,
}: {
  options: MetricRegionOption[];
  selectedRegion: string;
  onSelect: (region: string) => void;
  title: string;
  baseImageUrl: string | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Las flechas no se deshabilitan en los extremos a propósito: medir el
  // desbordamiento exigía re-medir en cada cambio de métrica y de ancho, y el
  // navegador ya acota el scroll, así que en el extremo el botón no hace nada.
  function scrollBy(direction: 1 | -1) {
    trackRef.current?.scrollBy({
      left: direction * 240,
      behavior: "smooth",
    });
  }

  return (
    <ModuleCard className="space-y-3 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          Selecciona la zona del rostro para ver el detalle del análisis.
        </p>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Ver zonas anteriores"
          className="absolute top-1/2 -left-1 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div
          ref={trackRef}
          className="flex gap-3 overflow-x-auto scroll-smooth px-8 py-1"
        >
          {options.map((option) => {
            const active = option.region === selectedRegion;
            return (
              <button
                key={option.region}
                type="button"
                onClick={() => onSelect(option.region)}
                className={cn(
                  "flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border p-2 transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/40",
                )}
              >
                <span className="relative block size-16 overflow-hidden rounded-lg bg-muted">
                  {baseImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={baseImageUrl}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : null}
                  {option.maskUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={option.maskUrl}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : null}
                  <ImageWatermark className="right-0.5 bottom-0.5 w-[55%] min-w-0" />
                </span>
                <span
                  className={cn(
                    "text-center text-[11px] leading-tight",
                    active ? "font-semibold text-primary" : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {option.skinType
                    ? analisisPiel360SkinTypeLabel(option.skinType)
                    : option.score != null
                      ? Math.round(option.score)
                      : "·"}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Ver más zonas"
          className="absolute top-1/2 -right-1 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </ModuleCard>
  );
}
