"use client";

import { AnalysesTable } from "@/components/analyses/analyses-table";
import { DashboardCredits } from "@/components/doctor/dashboard-credits";
import { DashboardRecentActivity } from "@/components/doctor/dashboard-recent-activity";
import { DashboardStats } from "@/components/doctor/dashboard-stats";
import type { AnalysisListItem } from "@/lib/queries/analyses";
import type { Doctor } from "@/lib/queries/doctors";
import type { Patient } from "@/lib/queries/patients";
import type { Subscription } from "@/lib/queries/subscriptions";

export function DoctorHomeDashboard({
  profile,
  verified = true,
  patientCount = 0,
  pendingCount = 0,
  analysesCount = 0,
  protocolsCount = 0,
  subscriptions = [],
  pendingAnalyses = [],
  recentAnalyses = [],
  patients = [],
  loading = false,
}: {
  profile: Doctor;
  verified?: boolean;
  patientCount?: number;
  pendingCount?: number;
  analysesCount?: number;
  protocolsCount?: number;
  subscriptions?: Subscription[];
  pendingAnalyses?: AnalysisListItem[];
  recentAnalyses?: AnalysisListItem[];
  patients?: Patient[];
  loading?: boolean;
}) {
  const name = `Dr(a). ${profile.firstName} ${profile.lastName}`.trim();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-2xl font-semibold text-zinc-900">Hola, {name}</h2>
        {!verified ? (
          <p className="text-xs text-zinc-500">
            Algunas métricas se activarán al aprobar tu cuenta
          </p>
        ) : null}
      </div>

      <DashboardStats
        patientCount={patientCount}
        pendingCount={pendingCount}
        analysesCount={analysesCount}
        protocolsCount={protocolsCount}
        preview={!verified && patientCount === 0 && analysesCount === 0}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {subscriptions.length > 0 ? (
          <DashboardCredits subscriptions={subscriptions} />
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 shadow-sm">
            {loading ? "Cargando créditos…" : "No tienes suscripciones activas."}
          </div>
        )}
        <DashboardRecentActivity
          analyses={recentAnalyses}
          patients={patients}
        />
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : (
        <AnalysesTable
          title="Pendientes de confirmar"
          variant="modern"
          analyses={pendingAnalyses}
        />
      )}

      <AnalysesTable
        title="Análisis recientes"
        variant="modern"
        analyses={recentAnalyses}
      />
    </section>
  );
}
