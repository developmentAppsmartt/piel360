"use client";

import { Layers, NotebookPen } from "lucide-react";
import { LayeredAnalysisImage } from "@/components/patients/layered-analysis-image";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";

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
            <>
              <LayeredAnalysisImage
                photoUrl={initial.photoUrl}
                maskUrl={initial.maskUrl}
                alt="Captura inicial"
                className="absolute inset-0 size-full"
              />
              {current.photoUrl || current.maskUrl ? (
                <div className="absolute inset-0 opacity-55 mix-blend-multiply">
                  <LayeredAnalysisImage
                    photoUrl={current.photoUrl}
                    maskUrl={current.maskUrl}
                    alt="Captura actual"
                    className="size-full bg-transparent"
                  />
                </div>
              ) : null}
            </>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">{datesLabel}</p>
      </ModuleCard>

      <ModuleCard className="flex min-h-[220px] flex-col p-4">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-4 text-primary" aria-hidden />
          <ModuleCardTitle className="text-sm">Notas</ModuleCardTitle>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Observaciones generales de esta comparación y notas por categoría en la tabla.
        </p>
        <label className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Nota general</span>
          <textarea
            value={generalNote}
            onChange={(e) => onGeneralNoteChange(e.target.value)}
            rows={6}
            placeholder="Resumen clínico, plan de tratamiento, observaciones generales…"
            className="min-h-[8rem] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </label>
        {categoryLabel ? (
          <label className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
            <span className="text-xs font-semibold text-muted-foreground">Nota — {categoryLabel}</span>
            <textarea
              value={categoryNote}
              onChange={(e) => onCategoryNoteChange(e.target.value)}
              rows={3}
              placeholder="Observaciones de esta categoría…"
              className="resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </label>
        ) : null}
      </ModuleCard>
    </aside>
  );
}
