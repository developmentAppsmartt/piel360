"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ModuleCard } from "@/components/ui/module-card";
import { PatientAnalysesTable } from "@/components/patients/patient-analyses-table";
import { PatientAnalysisTypeFilter } from "@/components/patients/patient-analysis-type-filter";
import { PatientProfileShell } from "@/components/patients/patient-profile-shell";
import { ApiError } from "@/lib/api-error";
import { filterAnalysesByType, type AnalysisTypeFilter } from "@/lib/patient-comparison";
import { usePatient, usePatientAnalyses } from "@/lib/queries/patients";

export default function AdminPacienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const patient = usePatient(id);
  const analyses = usePatientAnalyses(id);
  const [typeFilter, setTypeFilter] = useState<AnalysisTypeFilter>("all");

  const authError =
    (patient.error instanceof ApiError && patient.error.status === 401) ||
    (analyses.error instanceof ApiError && analyses.error.status === 401);

  useEffect(() => {
    if (authError) router.push("/admin/login");
  }, [authError, router]);

  if (patient.isLoading) {
    return <p className="text-muted-foreground">Cargando paciente…</p>;
  }
  if (!authError && patient.error) {
    return <p className="text-destructive">No se pudo cargar el paciente.</p>;
  }
  if (!patient.data) return null;

  const p = patient.data;

  return (
    <PatientProfileShell
      patient={p}
      panel="admin"
      showNewAnalysis={false}
      analysisFilter={<PatientAnalysisTypeFilter value={typeFilter} onChange={setTypeFilter} />}
    >
      {analyses.isLoading || (!authError && analyses.error) ? (
        <ModuleCard className="p-4">
          <h2 className="text-base font-semibold">Historial de análisis</h2>
          <p
            className={
              analyses.isLoading
                ? "mt-2 text-sm text-muted-foreground"
                : "mt-2 text-sm text-destructive"
            }
          >
            {analyses.isLoading
              ? "Cargando historial…"
              : "No se pudo cargar el historial."}
          </p>
        </ModuleCard>
      ) : null}

      {analyses.data ? (
        <PatientAnalysesTable analyses={filterAnalysesByType(analyses.data, typeFilter)} />
      ) : null}
    </PatientProfileShell>
  );
}
