"use client";

import { useState } from "react";
import { AnalysesTimeSeriesChart } from "@/components/admin/analyses-time-series-chart";
import { DiagnosisByAgeChart } from "@/components/admin/diagnosis-by-age-chart";
import { DiagnosisByClassChart } from "@/components/admin/diagnosis-by-class-chart";
import { ReportsDateFilter } from "@/components/admin/reports-date-filter";
import { SubscriptionStatusChart } from "@/components/admin/subscription-status-chart";
import { SkiniverReportView } from "@/components/reports/skiniver-report-view";
import {
  useAdminReports,
  useAdminSkiniverReport,
  type ReportsFilters,
} from "@/lib/queries/admin-reports";
import { cn } from "@/lib/utils";

type AdminReportTab = "general" | "dermatologico";

const TABS: { key: AdminReportTab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "dermatologico", label: "Análisis dermatológico" },
];

export default function ReportesPage() {
  const [filters, setFilters] = useState<ReportsFilters>({ granularity: "month" });
  const [tab, setTab] = useState<AdminReportTab>("general");

  const isDerm = tab === "dermatologico";
  const reports = useAdminReports(filters);
  const skiniver = useAdminSkiniverReport(filters, isDerm);
  const active = isDerm ? skiniver : reports;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reportes</h1>

      <ReportsDateFilter filters={filters} onChange={setFilters} />

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

      {active.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {active.error && (
        <p className="text-destructive">No se pudieron cargar los reportes.</p>
      )}

      {!isDerm && reports.data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SubscriptionStatusChart subscriptionStatus={reports.data.subscriptionStatus} />
          <DiagnosisByAgeChart diagnosisByAge={reports.data.diagnosisByAge} />
          <DiagnosisByClassChart diagnosisByClass={reports.data.diagnosisByClass} />
          <AnalysesTimeSeriesChart timeSeries={reports.data.timeSeries} />
        </div>
      )}

      {/* Sin el buscador clínico: carga el listado completo de análisis para
          filtrar en cliente, y a escala de plataforma eso no es viable. */}
      {isDerm && skiniver.data && (
        <SkiniverReportView report={skiniver.data} showClinicalBrowser={false} />
      )}
    </div>
  );
}
