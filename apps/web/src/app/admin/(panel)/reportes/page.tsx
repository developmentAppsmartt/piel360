"use client";

import { useState } from "react";
import { AdminReportScopeSelect } from "@/components/admin/admin-report-scope-select";
import { AnalysesTimeSeriesChart } from "@/components/admin/analyses-time-series-chart";
import { DiagnosisByAgeChart } from "@/components/admin/diagnosis-by-age-chart";
import { DiagnosisByClassChart } from "@/components/admin/diagnosis-by-class-chart";
import { ReportGranularitySelect } from "@/components/admin/report-granularity-select";
import { SubscriptionStatusChart } from "@/components/admin/subscription-status-chart";
import {
  canExportReport,
  exportReportCsv,
  type ReportTab,
} from "@/components/reports/report-csv";
import {
  ReportFilters,
  rangeForDays,
} from "@/components/reports/report-filters";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import type { TopProblemsSort } from "@/components/reports/top-problems-table";
import {
  useAdminReports,
  type ReportGranularity,
} from "@/lib/queries/admin-reports";
import {
  useAnalisisDermaPiel360Report,
  useLifestyleReport,
  useSkinHealthReport,
  type DoctorReportsFilters,
} from "@/lib/queries/doctor-reports";

type AdminTab = "general" | ReportTab;

/**
 * «General» son las métricas de plataforma del admin; el resto, los mismos
 * reportes que ven doctores y empresas, para toda la plataforma o para una
 * empresa o un profesional.
 */
export default function ReportesPage() {
  const [filters, setFilters] = useState<DoctorReportsFilters>({
    ...rangeForDays(180),
    trendMonths: 6,
  });
  const [granularity, setGranularity] = useState<ReportGranularity>("month");
  const [tab, setTab] = useState<AdminTab>("general");
  const [sort, setSort] = useState<TopProblemsSort>("score");

  const isGeneral = tab === "general";
  const general = useAdminReports({
    startDate: filters.from,
    endDate: filters.to,
    granularity,
  });
  const skin = useSkinHealthReport(filters, "admin");
  const lifestyle = useLifestyleReport(filters, "admin");
  const derm = useAnalisisDermaPiel360Report(
    filters,
    tab === "dermatologico",
    "admin",
  );
  const data = { skin: skin.data, lifestyle: lifestyle.data, derm: derm.data };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
          Métricas de la plataforma y los mismos reportes que ven doctores y
          empresas.
        </p>
      </div>

      <ReportFilters
        filters={filters}
        onChange={setFilters}
        // Las métricas de «General» son de toda la plataforma: el alcance no aplica.
        scopeFilter={
          isGeneral ? null : (
            <AdminReportScopeSelect
              value={filters}
              onChange={(scope) => setFilters({ ...filters, ...scope })}
            />
          )
        }
        onExport={
          isGeneral ? undefined : () => exportReportCsv(tab, data, sort)
        }
        exportDisabled={isGeneral || !canExportReport(tab, data)}
      />

      <ReportsWorkspace
        tab={tab}
        onTabChange={(next) => setTab(next as AdminTab)}
        sort={sort}
        onSortChange={setSort}
        skin={skin}
        lifestyle={lifestyle}
        derm={derm}
        leadingTabs={[{ key: "general", label: "General" }]}
        showClinicalBrowser={false}
      />

      {isGeneral ? (
        <div className="space-y-4">
          <ReportGranularitySelect
            value={granularity}
            onChange={setGranularity}
          />
          {general.isLoading && (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          )}
          {general.error && (
            <p className="text-sm text-destructive">
              No se pudieron cargar los reportes.
            </p>
          )}
          {general.data && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SubscriptionStatusChart
                subscriptionStatus={general.data.subscriptionStatus}
              />
              <DiagnosisByAgeChart
                diagnosisByAge={general.data.diagnosisByAge}
              />
              <DiagnosisByClassChart
                diagnosisByClass={general.data.diagnosisByClass}
              />
              <AnalysesTimeSeriesChart timeSeries={general.data.timeSeries} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
