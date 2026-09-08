"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { ModuleCard } from "@/components/ui/module-card";
import { NeedsMapView } from "@/components/reports/needs-map-view";
import {
  ReportFilters,
  rangeForDays,
} from "@/components/reports/report-filters";
import { SkinHealthSummary } from "@/components/reports/skin-health-summary";
import {
  TopProblemsTable,
  sortCategories,
  type TopProblemsSort,
} from "@/components/reports/top-problems-table";
import { downloadCsv } from "@/lib/csv-export";
import {
  useDoctorSkinHealthReport,
  type DoctorReportsFilters,
} from "@/lib/queries/doctor-reports";
import { useOrganizationTeam } from "@/lib/queries/organizations";
import { cn } from "@/lib/utils";

type ReportTab = "resumen" | "necesidades" | "top";

const TABS: { key: ReportTab; label: string }[] = [
  { key: "resumen", label: "Resumen de salud de la piel" },
  { key: "necesidades", label: "Mapa de necesidades" },
  { key: "top", label: "Top problemas" },
];

export default function ReportesPage() {
  const [filters, setFilters] = useState<DoctorReportsFilters>({
    ...rangeForDays(180),
    trendMonths: 6,
  });
  const [tab, setTab] = useState<ReportTab>("resumen");
  const [sort, setSort] = useState<TopProblemsSort>("score");

  const report = useDoctorSkinHealthReport(filters);
  const team = useOrganizationTeam();
  const members = team.data?.members ?? [];
  // El backend solo acepta professionalUserId del dueño del equipo.
  const showProfessionalFilter = members.length > 1;

  function handleExport() {
    const data = report.data;
    if (!data) return;

    if (tab === "top" || tab === "necesidades") {
      const rows: (string | number | null)[][] = [
        [
          "Categoría",
          "Puntaje promedio",
          "Pacientes",
          "Pacientes afectados",
          "% afectados",
          "% candidatos a protocolo",
          "Mediciones",
          "Evolución",
        ],
        ...sortCategories(data.categories, sort).map((c) => [
          c.label,
          c.avgScore != null ? c.avgScore.toFixed(1) : "",
          c.patients,
          c.patientsAffected,
          c.affectedPct.toFixed(1),
          c.candidatePct.toFixed(1),
          c.samples,
          c.trendDelta != null ? c.trendDelta.toFixed(1) : "",
        ]),
      ];
      downloadCsv(`reporte-categorias-${data.range.from}_${data.range.to}`, rows);
      return;
    }

    const k = data.kpis;
    const rows: (string | number | null)[][] = [
      ["Indicador", "Periodo actual", "Periodo anterior"],
      ["Pacientes analizados", k.patientsAnalyzed.current, k.patientsAnalyzed.previous],
      ["Análisis realizados", k.analyses.current, k.analyses.previous],
      ["Puntaje promedio de piel", k.averageScore.current, k.averageScore.previous],
      ["Edad promedio de piel", k.averageSkinAge.current, k.averageSkinAge.previous],
      [
        "Diferencia edad de piel vs real",
        k.skinAgeDifference.current,
        k.skinAgeDifference.previous,
      ],
      [
        "% pacientes en estado crítico",
        k.criticalPatientsPct.current,
        k.criticalPatientsPct.previous,
      ],
      [
        "% candidatos a protocolo",
        k.protocolCandidatesPct.current,
        k.protocolCandidatesPct.previous,
      ],
      [],
      ["Banda", "Análisis", "%"],
      ...data.distribution.map((d) => [d.label, d.count, d.pct.toFixed(1)]),
      [],
      ["Mes", "Puntaje promedio", "Análisis"],
      ...data.scoreTrend.map((p) => [
        p.period,
        p.avgScore != null ? p.avgScore.toFixed(1) : "",
        p.analyses,
      ]),
    ];
    downloadCsv(`reporte-resumen-${data.range.from}_${data.range.to}`, rows);
  }

  const isEmpty = report.data && report.data.distributionTotal === 0;

  return (
    <div className="space-y-5">
      <div>
        <h1>Reportes</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
          Analítica de salud de la piel de tus pacientes a partir de los análisis de
          piel con IA.
        </p>
      </div>

      <ReportFilters
        filters={filters}
        onChange={setFilters}
        members={members}
        showProfessionalFilter={showProfessionalFilter}
        onExport={handleExport}
        exportDisabled={!report.data || isEmpty}
      />

      <div
        role="tablist"
        aria-label="Vista del reporte"
        className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-0.5"
      >
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === item.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {report.isLoading && (
        <p className="text-sm text-muted-foreground">Cargando reportes…</p>
      )}
      {report.error && (
        <p className="text-sm text-destructive">No se pudieron cargar los reportes.</p>
      )}

      {report.data && isEmpty ? (
        <ModuleCard className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <BarChart3 className="size-6" />
          </span>
          <div>
            <p className="font-semibold">Aún no hay datos en este periodo</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Estos reportes se construyen con los análisis de piel con IA. Amplía el
              rango de fechas o realiza un análisis para empezar a ver resultados.
            </p>
          </div>
        </ModuleCard>
      ) : null}

      {report.data && !isEmpty ? (
        <>
          {tab === "resumen" && <SkinHealthSummary report={report.data} />}
          {tab === "necesidades" && <NeedsMapView report={report.data} />}
          {tab === "top" && (
            <ModuleCard className="p-5">
              <TopProblemsTable
                categories={report.data.categories}
                sort={sort}
                onSortChange={setSort}
              />
            </ModuleCard>
          )}
        </>
      ) : null}
    </div>
  );
}
