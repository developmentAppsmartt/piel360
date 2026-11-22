"use client";

import { dermaOutcome } from "@piel360/shared";
import { ProfessionalOutcomeCard } from "@/components/analyses/professional-outcome-card";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import type { AnalysisDetail } from "@/lib/queries/analyses";
import { ComparisonImage } from "./comparison-pieces";

/** Las tres imágenes que deja un análisis dermatológico. */
export const DERM_LAYERS = [
  { id: "original", label: "Original" },
  { id: "heatmap", label: "Mapa de Calor" },
  { id: "mask", label: "Máscara" },
] as const;

export type DermLayer = (typeof DERM_LAYERS)[number]["id"];

export function dermLayerUrl(detail: AnalysisDetail | undefined, layer: DermLayer): string | null {
  if (!detail) return null;
  if (layer === "heatmap") return detail.coloredUrl;
  if (layer === "mask") return detail.maskedUrl;
  return detail.imageUrl;
}

function DermColumn({
  label,
  date,
  detail,
  onOpenLayer,
}: {
  label: string;
  date?: string;
  detail: AnalysisDetail | undefined;
  onOpenLayer: (layer: DermLayer) => void;
}) {
  const outcome = detail ? dermaOutcome(detail) : null;
  return (
    <section className="space-y-4" aria-label={`Análisis ${label.toLowerCase()}`}>
      <div className="flex items-baseline justify-between gap-2 border-b border-border pb-2">
        <p className="text-sm font-semibold">{label}</p>
        {date ? <p className="text-xs text-muted-foreground">{date}</p> : null}
      </div>
      {outcome ? (
        <ProfessionalOutcomeCard {...outcome} />
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {detail ? "Sin diagnóstico registrado." : "Cargando análisis…"}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {DERM_LAYERS.map((layer) => (
          <ComparisonImage
            key={layer.id}
            label={layer.label}
            photoUrl={dermLayerUrl(detail, layer.id)}
            onClick={() => onOpenLayer(layer.id)}
          />
        ))}
      </div>
    </section>
  );
}

/** Comparación dermatológica: por cada fecha, el diagnóstico del profesional
 * (o lo que sugiere la IA si no ha confirmado) y el análisis completo por
 * imagen. Cada imagen abre el modal con esa misma capa de las dos fechas. */
export function ComparisonDermCard({
  initial,
  current,
  initialDate,
  currentDate,
  onOpenLayer,
}: {
  initial: AnalysisDetail | undefined;
  current: AnalysisDetail | undefined;
  initialDate?: string;
  currentDate?: string;
  onOpenLayer: (layer: DermLayer) => void;
}) {
  return (
    <ModuleCard className="p-5">
      <ModuleCardTitle className="text-sm">Comparación dermatológica</ModuleCardTitle>
      <p className="mt-1 text-xs text-muted-foreground">
        Diagnóstico del profesional y análisis completo de las dos capturas seleccionadas.
      </p>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <DermColumn label="Inicial" date={initialDate} detail={initial} onOpenLayer={onOpenLayer} />
        <DermColumn label="Actual" date={currentDate} detail={current} onOpenLayer={onOpenLayer} />
      </div>
    </ModuleCard>
  );
}
