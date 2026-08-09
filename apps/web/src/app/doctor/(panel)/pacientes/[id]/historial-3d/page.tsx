"use client";

import { useParams } from "next/navigation";
import { PatientBodyHistory } from "@/components/analyses/patient-body-history";
import { genderFromPatient } from "@/lib/body-model";
import { usePatient, usePatientAnalyses3D } from "@/lib/queries/patients";

export default function Historial3DPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const patient = usePatient(patientId);
  const analyses = usePatientAnalyses3D(patientId);

  if (patient.isLoading || analyses.isLoading) {
    return <p className="text-muted-foreground">Cargando historial 3D...</p>;
  }
  if (patient.error || analyses.error) {
    return <p className="text-destructive">No se pudo cargar el historial 3D.</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Historial 3D</h1>
      <PatientBodyHistory
        analyses={analyses.data ?? []}
        initialGender={genderFromPatient(patient.data?.gender)}
      />
    </div>
  );
}
