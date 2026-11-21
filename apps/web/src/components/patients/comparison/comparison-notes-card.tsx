"use client";

import { NotebookPen } from "lucide-react";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";

/** Nota general de la comparación y, si hay una categoría elegida, su nota.
 * Salen en el reporte comparativo en PDF. */
export function ComparisonNotesCard({
  description,
  generalNote,
  onGeneralNoteChange,
  categoryLabel = null,
  categoryNote = "",
  onCategoryNoteChange,
}: {
  description: string;
  generalNote: string;
  onGeneralNoteChange: (value: string) => void;
  /** null: sin nota de categoría. */
  categoryLabel?: string | null;
  categoryNote?: string;
  onCategoryNoteChange?: (value: string) => void;
}) {
  return (
    <ModuleCard className="flex min-h-[220px] flex-col p-4">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-4 text-primary" aria-hidden />
        <ModuleCardTitle className="text-sm">Notas</ModuleCardTitle>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
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
      {categoryLabel && onCategoryNoteChange ? (
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
  );
}
