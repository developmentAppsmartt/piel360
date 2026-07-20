"use client";

import { useParams, useRouter } from "next/navigation";
import { PatientForm } from "@/components/patients/patient-form";
import { usePatient, useUpdatePatient } from "@/lib/queries/patients";

export default function EditarPacientePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const patient = usePatient(id);
  const updatePatient = useUpdatePatient(id);

  if (patient.isLoading) return <p className="text-muted-foreground">Cargando paciente...</p>;
  if (!patient.data) return <p className="text-destructive">No se pudo cargar el paciente.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar paciente</h1>
      <PatientForm
        defaultValues={patient.data}
        submitLabel="Guardar cambios"
        onSubmit={async (input) => {
          await updatePatient.mutateAsync(input);
          router.push(`/doctor/pacientes/${id}`);
        }}
      />
    </div>
  );
}
