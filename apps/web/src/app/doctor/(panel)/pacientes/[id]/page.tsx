"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ModuleCard } from "@/components/ui/module-card";
import { PatientAnalysesTable } from "@/components/patients/patient-analyses-table";
import { PatientProfileShell } from "@/components/patients/patient-profile-shell";
import { PatientQuickActions } from "@/components/patients/patient-quick-actions";
import { ApiError } from "@/lib/api-error";
import { usePatient, usePatientAnalyses } from "@/lib/queries/patients";

export default function PacienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Lo pone la pantalla de alta: ahí no se podía avisar porque redirige aquí.
  const correoFallido = useSearchParams().get("correo") === "fallo";
  const patient = usePatient(id);
  const analyses = usePatientAnalyses(id);

  const authError =
    (patient.error instanceof ApiError && patient.error.status === 401) ||
    (analyses.error instanceof ApiError && analyses.error.status === 401);

  useEffect(() => {
    if (authError) router.push("/doctor/login");
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
    <PatientProfileShell patient={p} panel="doctor">
      {correoFallido ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El paciente quedó creado, pero no se pudo enviar el correo de
          bienvenida. Avísale por otro medio
          {p.userId ? " y pásale su clave de acceso" : ""}.
        </p>
      ) : null}
      <PatientQuickActions patientId={p.id} />

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
        <PatientAnalysesTable
          analyses={analyses.data}
          getRowHref={(a) => `/doctor/pacientes/${id}/analisis/${a.id}`}
        />
      ) : null}
    </PatientProfileShell>
  );
}
