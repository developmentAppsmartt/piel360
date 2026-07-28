"use client";

import { useState } from "react";
import { AnalysesTimeSeriesChart } from "@/components/admin/analyses-time-series-chart";
import { DiagnosisByAgeChart } from "@/components/admin/diagnosis-by-age-chart";
import { DiagnosisByClassChart } from "@/components/admin/diagnosis-by-class-chart";
import { ReportsDateFilter } from "@/components/admin/reports-date-filter";
import { SubscriptionStatusChart } from "@/components/admin/subscription-status-chart";
import { useAdminReports, type ReportsFilters } from "@/lib/queries/admin-reports";

export default function ReportesPage() {
  const [filters, setFilters] = useState<ReportsFilters>({ granularity: "month" });
  const reports = useAdminReports(filters);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reportes</h1>

      <ReportsDateFilter filters={filters} onChange={setFilters} />

      {reports.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {reports.error && <p className="text-destructive">No se pudieron cargar los reportes.</p>}

      {reports.data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SubscriptionStatusChart subscriptionStatus={reports.data.subscriptionStatus} />
          <DiagnosisByAgeChart diagnosisByAge={reports.data.diagnosisByAge} />
          <DiagnosisByClassChart diagnosisByClass={reports.data.diagnosisByClass} />
          <AnalysesTimeSeriesChart timeSeries={reports.data.timeSeries} />
        </div>
      )}
    </div>
  );
}
