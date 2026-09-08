"use client";

import type { SkinHealthReport } from "@piel360/shared";
import {
  ModuleCard,
  ModuleCardDescription,
  ModuleCardTitle,
} from "@/components/ui/module-card";
import {
  ReportHighlightCard,
  ReportKpiCard,
} from "@/components/reports/report-kpi-card";
import { ScoreDistributionDonut } from "@/components/reports/score-distribution-donut";
import { ScoreTrendChart } from "@/components/reports/score-trend-chart";

export function SkinHealthSummary({ report }: { report: SkinHealthReport }) {
  const { kpis } = report;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpiCard label="Pacientes analizados" delta={kpis.patientsAnalyzed} />
        <ReportKpiCard label="Análisis realizados" delta={kpis.analyses} />
        <ReportKpiCard
          label="Puntaje promedio de piel"
          delta={kpis.averageScore}
          decimals={1}
          deltaFormat="points"
        />
        <ReportKpiCard
          label="Edad promedio de piel"
          delta={kpis.averageSkinAge}
          decimals={1}
          deltaFormat="points"
        />
        <ReportKpiCard
          label="Diferencia edad de piel vs real"
          delta={kpis.skinAgeDifference}
          unit="years"
          decimals={1}
          deltaFormat="years"
          higherIsBetter={false}
          hint="Requiere fecha de nacimiento del paciente"
        />
        <ReportKpiCard
          label="Pacientes en estado crítico"
          delta={kpis.criticalPatientsPct}
          unit="pct"
          deltaFormat="points"
          higherIsBetter={false}
        />
        <ReportHighlightCard
          label="Categoría más comprometida"
          category={kpis.worstCategory}
          tone="bad"
        />
        <ReportHighlightCard
          label="Categoría con mejor resultado"
          category={kpis.bestCategory}
          tone="good"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">
            Distribución de puntajes de piel
          </ModuleCardTitle>
          <ModuleCardDescription>
            Cada análisis clasificado según su puntuación global.
          </ModuleCardDescription>
          <div className="mt-5">
            <ScoreDistributionDonut
              slices={report.distribution}
              total={report.distributionTotal}
            />
          </div>
        </ModuleCard>

        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-base">
            Evolución del puntaje promedio
          </ModuleCardTitle>
          <ModuleCardDescription>
            Últimos {report.range.trendMonths} meses.
          </ModuleCardDescription>
          <div className="mt-3">
            <ScoreTrendChart points={report.scoreTrend} />
          </div>
        </ModuleCard>
      </div>

      <p className="text-xs text-muted-foreground">
        Un paciente se considera en estado crítico cuando alguna categoría baja de 50
        puntos; candidato a protocolo cuando su peor categoría queda entre 50 y 69.
        Porcentajes calculados sobre {kpis.metricPatients}{" "}
        {kpis.metricPatients === 1 ? "paciente" : "pacientes"} con mediciones en el
        periodo.
      </p>
    </div>
  );
}
