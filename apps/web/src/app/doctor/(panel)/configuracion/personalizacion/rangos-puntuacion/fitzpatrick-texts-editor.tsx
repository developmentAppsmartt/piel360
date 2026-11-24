"use client";

import { useState } from "react";
import { LayoutGrid, PencilLine, Sun } from "lucide-react";
import {
  DEFAULT_FITZPATRICK_TEXTS,
  FITZPATRICK_SCALES,
  type AnalisisPiel360DescriptiveTexts,
  type FitzpatrickScale,
} from "@piel360/shared";
import { FITZPATRICK_TYPES } from "@/lib/fitzpatrick-labels";
import { cn } from "@/lib/utils";
import { DescriptiveTextField, NoScoreNotice } from "./descriptive-text-field";
import { CARD_CLASS } from "./score-config-labels";

function Swatch({ scale, className }: { scale: FitzpatrickScale; className?: string }) {
  return (
    <span
      className={cn("shrink-0 rounded-full border border-black/10", className)}
      style={{ backgroundColor: FITZPATRICK_TYPES[scale].colorHex }}
      aria-hidden
    />
  );
}

/** Configuración › Rangos de puntuación › Fototipo: un texto por tipo I–VI
 * para el análisis estético. El fototipo no tiene puntaje. */
export function FitzpatrickTextsEditor({
  texts,
  onChange,
}: {
  texts: AnalisisPiel360DescriptiveTexts["fitzpatrickTexts"];
  onChange: (scale: FitzpatrickScale, value: string | null) => void;
}) {
  const [scale, setScale] = useState<FitzpatrickScale>("I");
  const info = FITZPATRICK_TYPES[scale];
  const fallback = DEFAULT_FITZPATRICK_TEXTS[scale];

  return (
    <section className={cn(CARD_CLASS, "space-y-5")}>
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Sun className="size-5" aria-hidden />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Fototipo</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Personaliza los textos del análisis estético según el fototipo de la piel del paciente.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <LayoutGrid className="size-4 text-primary" aria-hidden />
          Fototipos disponibles
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FITZPATRICK_SCALES.map((option) => {
            const active = option === scale;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setScale(option)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition",
                  active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:bg-muted/60",
                )}
              >
                <Swatch scale={option} className="size-7" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    Fototipo {option}
                    {texts?.[option] ? (
                      <span className="size-1.5 rounded-full bg-primary" title="Personalizado" />
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {FITZPATRICK_TYPES[option].label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 rounded-xl bg-muted/40 p-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex items-start gap-3 md:flex-col md:border-r md:border-border md:pr-4">
          <Swatch scale={scale} className="size-16" />
          <div>
            <p className="text-base font-semibold text-foreground">Fototipo {scale}</p>
            <p className="text-sm text-muted-foreground">{info.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{info.reaction}</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <PencilLine className="size-4 text-primary" aria-hidden />
            Texto personalizado para Fototipo {scale}
          </p>
          <DescriptiveTextField
            key={scale}
            label={`Texto para el Fototipo ${scale}`}
            value={texts?.[scale] ?? fallback}
            fallback={fallback}
            onChange={(value) => onChange(scale, value)}
          />
        </div>
      </div>

      <NoScoreNotice>
        Recuerda: el fototipo no tiene puntaje, solo se utiliza para personalizar la interpretación
        del análisis.
      </NoScoreNotice>
    </section>
  );
}
