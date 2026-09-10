"use client";

import type { SkinReportSegmentBucket, SkinReportSegmentView } from "@piel360/shared";
import {
  ModuleCard,
  ModuleCardDescription,
  ModuleCardTitle,
  ModuleMetric,
} from "@/components/ui/module-card";
import { SegmentCategoryBars } from "@/components/reports/segment-category-bars";
import { SegmentDetailTable } from "@/components/reports/segment-detail-table";
import { SegmentDistributionDonut } from "@/components/reports/segment-distribution-donut";
import { SegmentInsightsCard, type SegmentInsight } from "@/components/reports/segment-insights-card";

/** "con/sin mascota" es una agregación de presentación: se calcula acá sumando
 * los buckets dog/cat/other contra "none", no en el backend. */
function collapseConSinMascota(
  buckets: SkinReportSegmentBucket[],
  total: number,
): SkinReportSegmentBucket[] {
  const sinMascota = buckets.find((b) => b.value === "none");
  const conMascotaBuckets = buckets.filter((b) => b.value !== "none");

  const patients = conMascotaBuckets.reduce((sum, b) => sum + b.patients, 0);
  const analyses = conMascotaBuckets.reduce((sum, b) => sum + b.analyses, 0);
  const weightedScore = conMascotaBuckets.reduce(
    (sum, b) => sum + (b.avgScore ?? 0) * b.analyses,
    0,
  );

  const conMascota: SkinReportSegmentBucket = {
    value: "__con_mascota",
    label: "Con mascota",
    color: "#0ea5e9",
    patients,
    analyses,
    avgScore: analyses > 0 ? weightedScore / analyses : null,
    pct: total > 0 ? (patients / total) * 100 : 0,
  };

  const sinMascotaBucket: SkinReportSegmentBucket = sinMascota
    ? { ...sinMascota, label: "Sin mascota", color: "#94a3b8" }
    : {
        value: "none",
        label: "Sin mascota",
        color: "#94a3b8",
        patients: 0,
        analyses: 0,
        avgScore: null,
        pct: 0,
      };

  return [conMascota, sinMascotaBucket];
}

function buildInsights(
  species: SkinReportSegmentBucket[],
  conSin: SkinReportSegmentBucket[],
): SegmentInsight[] {
  const insights: SegmentInsight[] = [];
  const [conMascota, sinMascota] = conSin;
  if (conMascota.avgScore != null && sinMascota.avgScore != null) {
    const diff = sinMascota.avgScore - conMascota.avgScore;
    if (Math.abs(diff) >= 0.5) {
      insights.push({
        text:
          diff > 0
            ? `Los pacientes con mascota presentan un puntaje global de piel ligeramente menor (${conMascota.avgScore.toFixed(0)} vs ${sinMascota.avgScore.toFixed(0)}).`
            : `Los pacientes con mascota presentan un puntaje global de piel mayor (${conMascota.avgScore.toFixed(0)} vs ${sinMascota.avgScore.toFixed(0)}).`,
        tone: "warning",
      });
    }
  }

  const scoredSpecies = species.filter((b) => b.avgScore != null && b.value !== "none");
  if (scoredSpecies.length >= 2) {
    const worst = scoredSpecies.reduce((a, b) => ((b.avgScore ?? 0) < (a.avgScore ?? 0) ? b : a));
    insights.push({
      text: `En pacientes con mascota, "${worst.label}" es el grupo con menor puntaje promedio (${(worst.avgScore ?? 0).toFixed(0)}).`,
    });
  }

  return insights;
}

export function PetsReport({ view }: { view: SkinReportSegmentView }) {
  const conSin = collapseConSinMascota(view.buckets, view.total);
  const species = view.buckets.filter((b) => b.value !== "none");
  const insights = buildInsights(view.buckets, conSin);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleCard className="flex flex-col gap-2 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Total de pacientes analizados
          </p>
          <ModuleMetric className="text-[1.75rem]">{view.total}</ModuleMetric>
        </ModuleCard>
        {conSin.map((bucket) => (
          <ModuleCard key={bucket.value} className="flex flex-col gap-2 p-4">
            <p className="text-xs font-medium text-muted-foreground">{bucket.label}</p>
            <ModuleMetric className="text-[1.75rem]">
              {bucket.patients}
              <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                ({bucket.pct.toFixed(0)}%)
              </span>
            </ModuleMetric>
          </ModuleCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">
            Con mascota vs. sin mascota
          </ModuleCardTitle>
          <ModuleCardDescription>
            Comparativo del estado de la piel en pacientes con y sin mascota.
          </ModuleCardDescription>
          <div className="mt-5">
            <SegmentDistributionDonut buckets={conSin} total={view.total} />
          </div>
        </ModuleCard>

        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">Por tipo de mascota</ModuleCardTitle>
          <ModuleCardDescription>
            Distribución de pacientes con mascota, por especie.
          </ModuleCardDescription>
          <div className="mt-5">
            <SegmentDistributionDonut
              buckets={species}
              total={species.reduce((sum, b) => sum + b.patients, 0)}
              centerLabel="Con mascota"
            />
          </div>
        </ModuleCard>
      </div>

      {insights.length > 0 && <SegmentInsightsCard insights={insights} />}

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">
          Categorías que más necesitan intervención
        </ModuleCardTitle>
        <ModuleCardDescription>
          Comparativo de puntaje promedio de la piel según tipo de mascota.
        </ModuleCardDescription>
        <div className="mt-5">
          <SegmentCategoryBars categories={view.categories} segments={view.buckets} />
        </div>
      </ModuleCard>

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">Detalle por categoría</ModuleCardTitle>
        <div className="mt-4">
          <SegmentDetailTable categories={view.categories} segments={view.buckets} />
        </div>
      </ModuleCard>
    </div>
  );
}
