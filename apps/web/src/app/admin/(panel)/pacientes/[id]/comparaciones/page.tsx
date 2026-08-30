"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PatientProfileShell } from "@/components/patients/patient-profile-shell";
import { PatientComparisonView } from "@/components/patients/patient-comparison-view";
import { ApiError } from "@/lib/api-error";
import { usePatient } from "@/lib/queries/patients";

export default function AdminPacienteComparacionesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const patient = usePatient(id);

  const authError =
    patient.error instanceof ApiError && patient.error.status === 401;

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

  return (
    <PatientProfileShell
      patient={patient.data}
      panel="admin"
      showNewAnalysis={false}
    >
      <PatientComparisonView patientId={id} />
    </PatientProfileShell>
  );
}
