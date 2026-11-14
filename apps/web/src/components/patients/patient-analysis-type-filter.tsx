"use client";

import { LayoutList, Sparkles, Stethoscope, Sun, type LucideIcon } from "lucide-react";
import type { AnalysisTypeFilter } from "@/lib/patient-comparison";
import { cn } from "@/lib/utils";

const OPTIONS: { value: AnalysisTypeFilter; label: string; icon: LucideIcon }[] = [
  { value: "all", label: "Todos", icon: LayoutList },
  { value: "aesthetic", label: "Estético", icon: Sparkles },
  { value: "derm", label: "Dermatológico", icon: Stethoscope },
  { value: "fitzpatrick", label: "Fototipo", icon: Sun },
];

/** Botones para filtrar el historial de análisis de la ficha por tipo. */
export function PatientAnalysisTypeFilter({
  value,
  onChange,
}: {
  value: AnalysisTypeFilter;
  onChange: (value: AnalysisTypeFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar análisis por tipo">
      {OPTIONS.map(({ value: option, label, icon: Icon }) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === option
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
