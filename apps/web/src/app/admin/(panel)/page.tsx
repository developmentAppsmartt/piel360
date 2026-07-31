"use client";

import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { AnalysesTable } from "@/components/analyses/analyses-table";
import { RiskChart } from "@/components/admin/risk-chart";
import { SubscriptionStats } from "@/components/admin/subscription-stats";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { useAdminDashboardStats } from "@/lib/queries/admin-dashboard";
import { useAnalyses } from "@/lib/queries/analyses";

export default function AdminDashboardPage() {
  const stats = useAdminDashboardStats();
  const analyses = useAnalyses();
  const latestAnalyses = analyses.data?.slice(0, 10) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Panel de administración
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen operativo de PIEL360.
          </p>
        </div>
        <Button
          type="button"
          className="gap-1.5"
          nativeButton={false}
          render={<Link href="/admin/bolsa-unidades" />}
        >
          <Package className="size-4" />
          Bolsa de unidades
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {stats.isLoading && (
        <p className="text-muted-foreground">Cargando estadísticas...</p>
      )}
      {stats.error && (
        <p className="text-destructive">No se pudieron cargar las estadísticas.</p>
      )}

      {stats.data && (
        <>
          <SubscriptionStats subscriptions={stats.data.subscriptions} />
          <RiskChart riskDistribution={stats.data.riskDistribution} />
        </>
      )}

      <ModuleCard className="space-y-4">
        <ModuleCardTitle>Últimos análisis</ModuleCardTitle>
        {analyses.isLoading && (
          <p className="text-muted-foreground">Cargando...</p>
        )}
        {analyses.error && (
          <p className="text-destructive">No se pudo cargar el historial.</p>
        )}
        {analyses.data && (
          <AnalysesTable analyses={latestAnalyses} getHref={() => null} />
        )}
      </ModuleCard>
    </div>
  );
}
