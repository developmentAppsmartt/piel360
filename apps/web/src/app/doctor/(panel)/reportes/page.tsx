"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  SKINIVER_AGE_BUCKETS,
  SKINIVER_DIAGNOSIS_CLASS_DEFS,
  SKINIVER_DISEASE_BUCKET_DEFS,
  type SkiniverDiagnosisClass,
  type SkiniverDiseaseBucket,
} from "@piel360/shared";
import { ModuleCard } from "@/components/ui/module-card";
import { BirthTypeReport } from "@/components/reports/birth-type-report";
import { NeedsMapView } from "@/components/reports/needs-map-view";
import { PetsReport } from "@/components/reports/pets-report";
import { PhysicalActivityReport } from "@/components/reports/physical-activity-report";
import {
  ReportFilters,
  rangeForDays,
} from "@/components/reports/report-filters";
import { SkinHealthSummary } from "@/components/reports/skin-health-summary";
import { SkiniverReportView } from "@/components/reports/skiniver-report-view";
import {
  TopProblemsTable,
  sortCategories,
  type TopProblemsSort,
} from "@/components/reports/top-problems-table";
import { downloadCsv } from "@/lib/csv-export";
import {
  useDoctorSkinHealthReport,
  useDoctorSkinSegmentsReport,
  useDoctorSkiniverReport,
  type DoctorReportsFilters,
} from "@/lib/queries/doctor-reports";
import { useOrganizationTeam } from "@/lib/queries/organizations";
import { cn } from "@/lib/utils";

type ReportTab =
  | "resumen"
  | "necesidades"
  | "top"
  | "nacimiento"
  | "mascotas"
  | "actividad"
  | "skiniver";

const TABS: { key: ReportTab; label: string }[] = [
  { key: "resumen", label: "Resumen de salud de la piel" },
  { key: "necesidades", label: "Mapa de necesidades" },
  { key: "top", label: "Top problemas" },
  { key: "nacimiento", label: "Tipo de nacimiento" },
  { key: "mascotas", label: "Mascotas y salud de la piel" },
  { key: "actividad", label: "Actividad física y deporte" },
  { key: "skiniver", label: "Análisis clínico IA" },
];

const SEGMENT_TABS: ReportTab[] = ["nacimiento", "mascotas", "actividad"];

const CLASS_KEYS = Object.keys(
  SKINIVER_DIAGNOSIS_CLASS_DEFS,
) as SkiniverDiagnosisClass[];
const DISEASE_KEYS = Object.keys(
  SKINIVER_DISEASE_BUCKET_DEFS,
) as SkiniverDiseaseBucket[];

export default function ReportesPage() {
  const [filters, setFilters] = useState<DoctorReportsFilters>({
    ...rangeForDays(180),
    trendMonths: 6,
  });
  const [tab, setTab] = useState<ReportTab>("resumen");
  const [sort, setSort] = useState<TopProblemsSort>("score");

  const report = useDoctorSkinHealthReport(filters);
  const segments = useDoctorSkinSegmentsReport(filters);
  const skiniver = useDoctorSkiniverReport(filters);
  const team = useOrganizationTeam();
  const members = team.data?.members ?? [];
  // El backend solo acepta professionalUserId del dueño del equipo.
  const showProfessionalFilter = members.length > 1;

  function handleExport() {
    if (tab === "skiniver") {
      const data = skiniver.data;
      if (!data) return;
      const rows: (string | number | null)[][] = [
        ["Mes", ...CLASS_KEYS.map((k) => SKINIVER_DIAGNOSIS_CLASS_DEFS[k].label)],
        ...data.byClass.map((p) => [
          p.period,
          ...CLASS_KEYS.map((k) => p.counts[k] ?? 0),
        ]),
        [],
        ["Mes", ...DISEASE_KEYS.map((k) => SKINIVER_DISEASE_BUCKET_DEFS[k].label)],
        ...data.byDisease.map((p) => [
          p.period,
          ...DISEASE_KEYS.map((k) => p.counts[k] ?? 0),
        ]),
        [],
        ["Mes", ...SKINIVER_AGE_BUCKETS.map((b) => b.label)],
        ...data.byAge.map((p) => [
          p.period,
          ...SKINIVER_AGE_BUCKETS.map((b) => p.counts[b.key] ?? 0),
        ]),
        [],
        ["Tono de piel", "Análisis", "%"],
        ...data.bySkinTone.map((b) => [b.label, b.count, b.pct.toFixed(1)]),
      ];
      downloadCsv(`reporte-skiniver-${data.range.from}_${data.range.to}`, rows);
      return;
    }

    if (SEGMENT_TABS.includes(tab)) {
      const data = segments.data;
      if (!data) return;
      const view =
        tab === "nacimiento"
          ? data.birthType
          : tab === "mascotas"
            ? data.mascotType
            : data.exerciseHabit;

      const rows: (string | number | null)[][] = [
        ["Grupo", "Pacientes", "Análisis", "%", "Puntaje promedio"],
        ...view.buckets.map((b) => [
          b.label,
          b.patients,
          b.analyses,
          b.pct.toFixed(1),
          b.avgScore != null ? b.avgScore.toFixed(1) : "",
        ]),
        [],
        ["Categoría", ...view.buckets.map((b) => b.label)],
        ...view.categories.map((c) => [
          c.label,
          ...view.buckets.map((b) => {
            const score = c.scoresBySegment[b.value];
            return score != null ? score.toFixed(1) : "";
          }),
        ]),
      ];
      downloadCsv(`reporte-${tab}-${data.range.from}_${data.range.to}`, rows);
      return;
    }

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

  const isSegmentTab = SEGMENT_TABS.includes(tab);
  const isSkiniverTab = tab === "skiniver";
  const isEmpty = report.data && report.data.distributionTotal === 0;
  const isSegmentsEmpty = segments.data && segments.data.birthType.total === 0;

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
        exportDisabled={
          isSkiniverTab
            ? !skiniver.data
            : isSegmentTab
              ? !segments.data || isSegmentsEmpty
              : !report.data || isEmpty
        }
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

      {(isSkiniverTab
        ? skiniver.isLoading
        : isSegmentTab
          ? segments.isLoading
          : report.isLoading) && (
        <p className="text-sm text-muted-foreground">Cargando reportes…</p>
      )}
      {(isSkiniverTab
        ? skiniver.error
        : isSegmentTab
          ? segments.error
          : report.error) && (
        <p className="text-sm text-destructive">No se pudieron cargar los reportes.</p>
      )}

      {isSkiniverTab
        ? null
        : isSegmentTab
        ? segments.data && isSegmentsEmpty && (
            <ModuleCard className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <BarChart3 className="size-6" />
              </span>
              <div>
                <p className="font-semibold">Aún no hay datos en este periodo</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Estos reportes se construyen con los análisis de piel con IA. Amplía
                  el rango de fechas o realiza un análisis para empezar a ver
                  resultados.
                </p>
              </div>
            </ModuleCard>
          )
        : report.data &&
          isEmpty && (
            <ModuleCard className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <BarChart3 className="size-6" />
              </span>
              <div>
                <p className="font-semibold">Aún no hay datos en este periodo</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Estos reportes se construyen con los análisis de piel con IA. Amplía
                  el rango de fechas o realiza un análisis para empezar a ver
                  resultados.
                </p>
              </div>
            </ModuleCard>
          )}

      {tab === "resumen" && report.data && !isEmpty && (
        <SkinHealthSummary report={report.data} />
      )}
      {tab === "necesidades" && report.data && !isEmpty && (
        <NeedsMapView report={report.data} />
      )}
      {tab === "top" && report.data && !isEmpty && (
        <ModuleCard className="p-5">
          <TopProblemsTable
            categories={report.data.categories}
            sort={sort}
            onSortChange={setSort}
          />
        </ModuleCard>
      )}
      {tab === "nacimiento" && segments.data && !isSegmentsEmpty && (
        <BirthTypeReport view={segments.data.birthType} />
      )}
      {tab === "mascotas" && segments.data && !isSegmentsEmpty && (
        <PetsReport view={segments.data.mascotType} />
      )}
      {tab === "actividad" && segments.data && !isSegmentsEmpty && (
        <PhysicalActivityReport view={segments.data.exerciseHabit} />
      )}
      {tab === "skiniver" && skiniver.data && (
        <SkiniverReportView report={skiniver.data} />
      )}
    </div>
  );
}
