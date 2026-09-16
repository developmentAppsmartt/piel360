"use client";

import type { SkinReportSegmentView } from "@piel360/shared";
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

function buildInsights(view: SkinReportSegmentView): SegmentInsight[] {
  const scored = view.buckets.filter((b) => b.avgScore != null);
  if (scored.length < 2) return [];

  const best = scored.reduce((a, b) => ((b.avgScore ?? 0) > (a.avgScore ?? 0) ? b : a));
  const worst = scored.reduce((a, b) => ((b.avgScore ?? 0) < (a.avgScore ?? 0) ? b : a));

  const insights: SegmentInsight[] = [];
  if (best.value !== worst.value) {
    insights.push({
      text: `Los pacientes con "${best.label}" presentan un puntaje promedio de piel mayor (${(best.avgScore ?? 0).toFixed(0)}) que los de "${worst.label}" (${(worst.avgScore ?? 0).toFixed(0)}).`,
      tone: "warning",
    });
  }

  const worstCategory = view.categories[0];
  if (worstCategory) {
    const entries = Object.entries(worstCategory.scoresBySegment).filter(
      ([, v]) => v != null,
    ) as [string, number][];
    if (entries.length >= 2) {
      const [minSeg] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
      const minLabel = view.buckets.find((b) => b.value === minSeg)?.label ?? minSeg;
      insights.push({
        text: `La categoría con mayor brecha entre grupos es "${worstCategory.label}", más comprometida en el grupo "${minLabel}".`,
      });
    }
  }

  return insights;
}

export function BirthTypeReport({ view }: { view: SkinReportSegmentView }) {
  const insights = buildInsights(view);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <ModuleCard className="flex flex-col gap-2 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Total de pacientes analizados
          </p>
          <ModuleMetric className="text-[1.75rem]">{view.total}</ModuleMetric>
        </ModuleCard>
        {view.buckets.map((bucket) => (
          <ModuleCard key={bucket.value} className="flex flex-col gap-2 p-4">
            <p className="text-xs font-medium text-muted-foreground">{bucket.label}</p>
            <ModuleMetric className="text-[1.75rem]">
              {bucket.patients}
              <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                ({bucket.pct.toFixed(0)}%)
              </span>
            </ModuleMetric>
            <p className="text-xs text-muted-foreground">
              Puntaje promedio{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {bucket.avgScore != null ? bucket.avgScore.toFixed(0) : "—"}
              </span>
            </p>
          </ModuleCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">
            Distribución de pacientes por tipo de nacimiento
          </ModuleCardTitle>
          <ModuleCardDescription>
            Comparativo de la salud de la piel según el tipo de nacimiento.
          </ModuleCardDescription>
          <div className="mt-5">
            <SegmentDistributionDonut buckets={view.buckets} total={view.total} />
          </div>
        </ModuleCard>

        {insights.length > 0 ? (
          <SegmentInsightsCard insights={insights} />
        ) : (
          <ModuleCard className="flex items-center justify-center p-5 text-sm text-muted-foreground">
            Sin datos suficientes para generar hallazgos.
          </ModuleCard>
        )}
      </div>

      <ModuleCard className="p-5">
        <ModuleCardTitle className="text-base">
          Categorías que más necesitan intervención
        </ModuleCardTitle>
        <ModuleCardDescription>
          Comparativo de puntaje promedio de la piel por tipo de nacimiento.
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
