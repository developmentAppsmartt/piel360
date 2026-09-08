"use client";

import { Info } from "lucide-react";
import {
  skinReportBand,
  skinReportBandColor,
  type SkinReportCategory,
} from "@piel360/shared";
import {
  ModuleCard,
  ModuleCardTitle,
  ModuleMetric,
} from "@/components/ui/module-card";
import { ScoreTrendChart } from "@/components/reports/score-trend-chart";

/** Recomendación determinista por banda — plantillas fijas, sin IA. */
function recommendationFor(category: SkinReportCategory): string {
  if (category.avgScore == null) return "Sin datos suficientes para recomendar.";
  const band = skinReportBand(category.avgScore);
  const name = category.label.toLowerCase();
  if (band === "malo") {
    return `${category.label} está en nivel crítico. Prioriza protocolos enfocados en ${name} y agenda seguimiento cercano para los pacientes afectados.`;
  }
  if (band === "regular") {
    return `${category.label} requiere atención. Considera planes de tratamiento específicos para ${name} y revisa la evolución en el próximo control.`;
  }
  if (band === "bueno") {
    return `${category.label} está en buen nivel. Mantén la rutina actual y refuerza el cuidado preventivo en los pacientes que aún requieren seguimiento.`;
  }
  return `${category.label} es una fortaleza de tus pacientes. Úsala como referencia para reforzar la adherencia al tratamiento.`;
}

function MiniKpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
      <ModuleMetric className="text-xl">{value}</ModuleMetric>
      <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

export function CategoryDetailPanel({
  category,
}: {
  category: SkinReportCategory | null;
}) {
  if (!category) {
    return (
      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">Detalle por categoría</ModuleCardTitle>
        <p className="mt-3 text-sm text-muted-foreground">
          Selecciona una categoría del ranking para ver su detalle.
        </p>
      </ModuleCard>
    );
  }

  const score = category.avgScore ?? 0;
  const color = skinReportBandColor(skinReportBand(score));

  return (
    <ModuleCard className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <ModuleCardTitle className="text-base">Detalle: {category.label}</ModuleCardTitle>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {score.toFixed(0)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniKpi value={String(category.patients)} label="Pacientes" />
        <MiniKpi value={score.toFixed(0)} label="Puntaje promedio" />
        <MiniKpi
          value={`${category.affectedPct.toFixed(0)}%`}
          label="Requieren seguimiento"
        />
        <MiniKpi
          value={`${category.candidatePct.toFixed(0)}%`}
          label="Candidatos a protocolo"
        />
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Evolución del puntaje
        </p>
        <ScoreTrendChart
          points={category.trend}
          height="h-40"
          emptyMessage="Sin histórico para esta categoría."
        />
      </div>

      <div className="flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {recommendationFor(category)}
        </p>
      </div>
    </ModuleCard>
  );
}
