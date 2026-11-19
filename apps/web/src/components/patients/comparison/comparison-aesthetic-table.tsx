"use client";

import { ArrowUpRight } from "lucide-react";
import type { ComparisonCategoryRow } from "@/lib/patient-comparison";
import { cn } from "@/lib/utils";
import { MetricIcon, ScoreMini, SkinThumb } from "./comparison-pieces";

/** Filtro de categorías y tabla Inicial / Actual / Mejora / Notas. */
export function ComparisonAestheticTable({
  categories,
  category,
  onCategoryChange,
  initialPhotoUrl,
  currentPhotoUrl,
  maskUrl,
  notes,
  onNoteChange,
  onOpenMetric,
}: {
  categories: ComparisonCategoryRow[];
  category: string;
  onCategoryChange: (id: string) => void;
  initialPhotoUrl: string | null;
  currentPhotoUrl: string | null;
  maskUrl: (side: "initial" | "current", metricType: string) => string | null;
  notes: Record<string, string>;
  onNoteChange: (categoryId: string, value: string) => void;
  onOpenMetric: (metricType: string, label: string) => void;
}) {
  if (categories.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No hay métricas comparables en los análisis seleccionados.
      </div>
    );
  }

  // Los chips son solo las categorías; al elegir Arrugas o Poros salen también sus zonas.
  const filters = [
    { id: "all", label: "Todas" },
    ...categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, label: c.label })),
  ];
  // «Arrugas — Frente» en el modal y en las notas: «Frente» solo no dice de qué.
  const fullLabel = (row: ComparisonCategoryRow) => {
    const parent = row.parentId ? categories.find((c) => c.id === row.parentId) : null;
    return parent ? `${parent.label} — ${row.label}` : row.label;
  };
  const rows =
    category === "all" ? categories : categories.filter((c) => c.id === category || c.parentId === category);

  return (
    <>
      <div className="flex flex-wrap gap-2 border-b border-border p-4">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onCategoryChange(f.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              category === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Categoría</th>
              <th className="px-4 py-3 font-semibold">Inicial</th>
              <th className="px-4 py-3 font-semibold">Actual</th>
              <th className="px-4 py-3 font-semibold">Mejora</th>
              <th className="min-w-[12rem] px-4 py-3 font-semibold">Notas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn("border-t border-border hover:bg-muted/20", row.parentId && "bg-muted/10")}
              >
                <td className="px-4 py-4">
                  {row.parentId ? (
                    <div className="flex items-center gap-2 pl-10 text-muted-foreground">
                      <span className="text-border" aria-hidden>
                        └
                      </span>
                      <span className="font-medium text-foreground">{row.label}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <MetricIcon metricType={row.id} />
                      </span>
                      <span className="font-medium">{row.label}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <ScoreMini score={row.initialScore} />
                    <SkinThumb
                      label="Captura inicial"
                      photoUrl={initialPhotoUrl}
                      maskUrl={maskUrl("initial", row.id)}
                      onClick={() => onOpenMetric(row.id, fullLabel(row))}
                    />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <ScoreMini score={row.currentScore} />
                    <SkinThumb
                      label="Captura actual"
                      photoUrl={currentPhotoUrl}
                      maskUrl={maskUrl("current", row.id)}
                      onClick={() => onOpenMetric(row.id, fullLabel(row))}
                    />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div
                    className={cn(
                      "flex items-center gap-1.5",
                      row.improvement >= 0 ? "text-emerald-700" : "text-red-700",
                    )}
                  >
                    <ArrowUpRight className={cn("size-4", row.improvement < 0 && "rotate-90")} />
                    <div>
                      <p className="font-semibold tabular-nums">
                        {row.improvement >= 0 ? "+" : ""}
                        {row.improvement}
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          row.improvement >= 0 ? "text-emerald-600/90" : "text-red-600/90",
                        )}
                      >
                        {row.improvementLabel}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <textarea
                    value={notes[row.id] ?? ""}
                    onChange={(e) => onNoteChange(row.id, e.target.value)}
                    rows={2}
                    placeholder={`Notas de ${fullLabel(row).toLowerCase()}…`}
                    className="w-full min-w-[11rem] resize-y rounded-lg border border-border bg-background px-2.5 py-2 text-xs leading-relaxed outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
