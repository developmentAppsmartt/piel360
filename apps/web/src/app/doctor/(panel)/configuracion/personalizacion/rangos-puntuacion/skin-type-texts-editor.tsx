"use client";

import { useState } from "react";
import { Check, LayoutGrid, PencilLine, UserRound } from "lucide-react";
import {
  ANALISIS_PIEL360_SKIN_TYPE_VALUES,
  DEFAULT_SKIN_TYPE_TEXTS,
  SKIN_TYPE_TEXT_ZONES,
  type AnalisisPiel360DescriptiveTexts,
  type SkinTypeTextZone,
  type SkinTypeValue,
} from "@piel360/shared";
import { cn } from "@/lib/utils";
import { analisisPiel360SkinTypeLabel } from "@/lib/youcam-metric-labels";
import { DescriptiveTextField, NoScoreNotice } from "./descriptive-text-field";
import { CARD_CLASS, SKIN_TYPE_ZONE_LABELS } from "./score-config-labels";

/** Configuración › Rangos de puntuación › Biotipo: un texto por biotipo en
 * cada zona (cara completa, zona T y zona U), sin puntaje ni rangos. */
export function SkinTypeTextsEditor({
  texts,
  onChange,
}: {
  texts: AnalisisPiel360DescriptiveTexts["skinTypeTexts"];
  onChange: (zone: SkinTypeTextZone, skinType: SkinTypeValue, value: string | null) => void;
}) {
  const [zone, setZone] = useState<SkinTypeTextZone>("whole");
  const [skinType, setSkinType] = useState<SkinTypeValue>("combination");
  const fallback = DEFAULT_SKIN_TYPE_TEXTS[zone][skinType];
  const label = analisisPiel360SkinTypeLabel(skinType);

  return (
    <section className={cn(CARD_CLASS, "space-y-5")}>
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="size-5" aria-hidden />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Personalización de biotipos</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configura los textos que verá el paciente según su biotipo y la zona del rostro. Los
            biotipos son categorías descriptivas y no tienen puntuación.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Zona del rostro">
        {SKIN_TYPE_TEXT_ZONES.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={option === zone}
            onClick={() => setZone(option)}
            className={cn(
              "h-11 min-w-32 rounded-full border px-5 text-sm font-semibold transition",
              option === zone
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-foreground hover:bg-muted/60",
            )}
          >
            {SKIN_TYPE_ZONE_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border/80 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <LayoutGrid className="size-4 text-primary" aria-hidden />
          Biotipos disponibles
        </p>
        <div className="flex flex-wrap gap-2">
          {ANALISIS_PIEL360_SKIN_TYPE_VALUES.map((value) => {
            const active = value === skinType;
            const customized = !!texts?.[zone]?.[value];
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setSkinType(value)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm transition",
                  active
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted/60",
                )}
              >
                {active ? <Check className="size-3.5" aria-hidden /> : null}
                {analisisPiel360SkinTypeLabel(value)}
                {customized && !active ? (
                  <span className="size-1.5 rounded-full bg-primary" title="Personalizado" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-muted/40 p-4">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          <PencilLine className="size-4 text-primary" aria-hidden />
          Editar texto para biotipo:
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">{label}</span>
          <span className="font-normal text-muted-foreground">· {SKIN_TYPE_ZONE_LABELS[zone]}</span>
        </p>
        <p className="text-sm font-medium text-foreground">
          Texto para el paciente <span className="text-destructive">*</span>
        </p>
        <DescriptiveTextField
          key={`${zone}:${skinType}`}
          label={`Texto para el biotipo ${label} en ${SKIN_TYPE_ZONE_LABELS[zone]}`}
          value={texts?.[zone]?.[skinType] ?? fallback}
          fallback={fallback}
          onChange={(value) => onChange(zone, skinType, value)}
        />
      </div>

      <NoScoreNotice>
        Recuerda: puedes configurar textos independientes para cada biotipo en los tres ámbitos:
        Cara completa, Zona T y Zona U. Si una zona del análisis no trae biotipo, no se muestra
        ningún texto.
      </NoScoreNotice>
    </section>
  );
}
