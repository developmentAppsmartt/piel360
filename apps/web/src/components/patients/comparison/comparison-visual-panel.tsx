"use client";

import { Layers } from "lucide-react";
import { BeforeAfterSlider } from "@/components/patients/before-after-slider";
import { LayeredAnalysisImage } from "@/components/patients/layered-analysis-image";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";
import { ComparisonNotesCard } from "./comparison-notes-card";

export type VisualMode = "overlay" | "side";

type Capture = { photoUrl: string | null; maskUrl: string | null };

/** Columna derecha del estético: la comparación visual (superpuesta o lado
 * a lado) y las notas generales y de la categoría elegida. */
export function ComparisonVisualPanel({
  visualMode,
  onVisualModeChange,
  initial,
  current,
  datesLabel,
  onOpen,
  generalNote,
  onGeneralNoteChange,
  categoryLabel,
  categoryNote,
  onCategoryNoteChange,
}: {
  visualMode: VisualMode;
  onVisualModeChange: (mode: VisualMode) => void;
  initial: Capture;
  current: Capture;
  datesLabel: string;
  onOpen: () => void;
  generalNote: string;
  onGeneralNoteChange: (value: string) => void;
  /** null con «Todas»: sin nota de categoría. */
  categoryLabel: string | null;
  categoryNote: string;
  onCategoryNoteChange: (value: string) => void;
}) {
  const hasVisual = !!(initial.photoUrl || current.photoUrl || initial.maskUrl || current.maskUrl);
  const modeButton = (mode: VisualMode, label: React.ReactNode) => (
    <button
      type="button"
      onClick={() => onVisualModeChange(mode)}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold",
        visualMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <aside className="space-y-4">
      <ModuleCard className="p-4">
        <ModuleCardTitle className="text-sm">Comparación visual</ModuleCardTitle>
        <div className="mt-3 flex rounded-xl border border-border p-1">
          {modeButton(
            "overlay",
            <>
              <Layers className="size-3.5" />
              Superposición
            </>,
          )}
          {modeButton("side", "Lado a lado")}
        </div>
        <button
          type="button"
          onClick={onOpen}
          disabled={!hasVisual}
          className={cn(
            "mt-4 w-full overflow-hidden rounded-xl border border-border bg-muted/20 text-left transition hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:hover:ring-0",
            visualMode === "overlay" ? "relative aspect-[3/4]" : "grid grid-cols-2 gap-2 p-2",
          )}
        >
          {visualMode === "side" ? (
            <>
              <LayeredAnalysisImage
                photoUrl={initial.photoUrl}
                maskUrl={initial.maskUrl}
                alt="Captura inicial"
                className="aspect-[3/4] w-full rounded-lg border border-border"
              />
              <LayeredAnalysisImage
                photoUrl={current.photoUrl}
                maskUrl={current.maskUrl}
                alt="Captura actual"
                className="aspect-[3/4] w-full rounded-lg border border-primary/30"
              />
            </>
          ) : (
            // Vista previa fija al 50 %: el deslizador se usa en el modal.
            <BeforeAfterSlider
              initial={initial}
              current={current}
              interactive={false}
              fit="cover"
              className="absolute inset-0"
            />
          )}
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">{datesLabel}</p>
      </ModuleCard>

      <ComparisonNotesCard
        description="Observaciones generales de esta comparación y notas por categoría en la tabla."
        generalNote={generalNote}
        onGeneralNoteChange={onGeneralNoteChange}
        categoryLabel={categoryLabel}
        categoryNote={categoryNote}
        onCategoryNoteChange={onCategoryNoteChange}
      />
    </aside>
  );
}
