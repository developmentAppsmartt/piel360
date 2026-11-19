"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PatientBodyHistory } from "@/components/analyses/patient-body-history";
import { Button } from "@/components/ui/button";
import { genderFromPatient } from "@/lib/body-model";
import { usePatient, usePatientAnalyses3D } from "@/lib/queries/patients";

export default function Historial3DPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const patient = usePatient(patientId);
  const analyses = usePatientAnalyses3D(patientId);

  if (patient.isLoading || analyses.isLoading) {
    return <p className="text-muted-foreground">Cargando historial 3D análisis dermatológico...</p>;
  }
  if (patient.error || analyses.error) {
    return <p className="text-destructive">No se pudo cargar el historial 3D análisis dermatológico.</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Historial 3D análisis dermatológico</h1>
        <Button
          variant="outline"
          className="gap-1.5"
          nativeButton={false}
          render={<Link href={`/doctor/pacientes/${patientId}`} />}
        >
          <ArrowLeft className="size-4" />
          Volver a la ficha
        </Button>
      </div>
      <PatientBodyHistory
        analyses={analyses.data ?? []}
        initialGender={genderFromPatient(patient.data?.gender)}
      />
    </div>
  );
}
