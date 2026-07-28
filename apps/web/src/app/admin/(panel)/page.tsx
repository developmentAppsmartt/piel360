"use client";

import { AnalysesTable } from "@/components/analyses/analyses-table";
import { RiskChart } from "@/components/admin/risk-chart";
import { SubscriptionStats } from "@/components/admin/subscription-stats";
import { useAdminDashboardStats } from "@/lib/queries/admin-dashboard";
import { useAnalyses } from "@/lib/queries/analyses";

export default function AdminDashboardPage() {
  const stats = useAdminDashboardStats();
  const analyses = useAnalyses();
  const latestAnalyses = analyses.data?.slice(0, 10) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Panel de administración</h1>

      {stats.isLoading && <p className="text-muted-foreground">Cargando estadísticas...</p>}
      {stats.error && <p className="text-destructive">No se pudieron cargar las estadísticas.</p>}

      {stats.data && (
        <>
          <SubscriptionStats subscriptions={stats.data.subscriptions} />
          <RiskChart riskDistribution={stats.data.riskDistribution} />
        </>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Últimos análisis</h2>
        {analyses.isLoading && <p className="text-muted-foreground">Cargando...</p>}
        {analyses.error && <p className="text-destructive">No se pudo cargar el historial.</p>}
        {analyses.data && <AnalysesTable analyses={latestAnalyses} getHref={() => null} />}
      </div>
    </div>
  );
}
