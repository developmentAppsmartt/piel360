import { ScanFace, Stethoscope, SunMedium, type LucideIcon } from "lucide-react";
import type { AnalysisKind } from "@/lib/patient-comparison";
import { cn } from "@/lib/utils";

export const ANALYSIS_KIND_META: Record<AnalysisKind, { label: string; icon: LucideIcon; chip: string }> = {
  aesthetic: {
    label: "Análisis Estético",
    icon: ScanFace,
    chip: "bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  },
  derm: {
    label: "Análisis Dermatológico",
    icon: Stethoscope,
    chip: "bg-violet-50 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
  },
  fitzpatrick: {
    label: "Análisis Fototipo",
    icon: SunMedium,
    chip: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  },
};

/** Chip del tipo de análisis con su ícono. `label` es el nombre que se pinta
 * (el del proveedor configurado, por `analysisProviderLabel`). */
export function AnalysisKindChip({ kind, label }: { kind: AnalysisKind; label: string }) {
  const meta = ANALYSIS_KIND_META[kind];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex max-w-44 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-normal", meta.chip)}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
