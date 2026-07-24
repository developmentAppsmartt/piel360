"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnalysesTable } from "@/components/analyses/analyses-table";
import { DashboardCredits } from "@/components/doctor/dashboard-credits";
import { DashboardStats } from "@/components/doctor/dashboard-stats";
import { ApiError } from "@/lib/api-error";
import { useAnalyses } from "@/lib/queries/analyses";
import { useMyDoctorProfile } from "@/lib/queries/doctors";
import { usePatients } from "@/lib/queries/patients";
import { useMySubscriptions } from "@/lib/queries/subscriptions";

export default function DoctorHomePage() {
  const router = useRouter();
  const profile = useMyDoctorProfile();
  const subscriptions = useMySubscriptions();
  const patients = usePatients();
  const analyses = useAnalyses();

  useEffect(() => {
    const errors = [profile.error, subscriptions.error, patients.error, analyses.error];
    if (errors.some((e) => e instanceof ApiError && e.status === 401)) {
      router.push("/doctor/login");
    }
  }, [profile.error, subscriptions.error, patients.error, analyses.error, router]);

  const pending = analyses.data?.filter((a) => !a.isConfirmed) ?? [];
  const recent = analyses.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {profile.data ? `Hola, Dr(a). ${profile.data.firstName} ${profile.data.lastName}` : "Panel del doctor"}
      </h1>

      {patients.data && analyses.data && (
        <DashboardStats patientCount={patients.data.length} pendingCount={pending.length} />
      )}

      {subscriptions.data && <DashboardCredits subscriptions={subscriptions.data} />}

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Pendientes de confirmar</h2>
        {analyses.isLoading && <p className="text-muted-foreground">Cargando...</p>}
        {analyses.data && (
          <AnalysesTable analyses={pending.slice(0, 5)} />
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Análisis recientes</h2>
        {analyses.isLoading && <p className="text-muted-foreground">Cargando...</p>}
        {analyses.data && <AnalysesTable analyses={recent.slice(0, 5)} />}
      </div>
    </div>
  );
}
