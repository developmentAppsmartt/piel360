"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PatientForm } from "@/components/patients/patient-form";
import { usePatient, useUpdatePatient } from "@/lib/queries/patients";

export default function EditarPacientePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const patient = usePatient(id);
  const updatePatient = useUpdatePatient(id);

  if (patient.isLoading) {
    return <p className="text-muted-foreground">Cargando paciente...</p>;
  }
  if (!patient.data) {
    return <p className="text-destructive">No se pudo cargar el paciente.</p>;
  }

  const fullName = `${patient.data.firstName} ${patient.data.lastName}`.trim();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/doctor/pacientes" className="hover:text-foreground">
            Pacientes
          </Link>{" "}
          ›{" "}
          <Link href={`/doctor/pacientes/${id}`} className="hover:text-foreground">
            {fullName}
          </Link>{" "}
          › <span className="text-foreground">Editar</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Editar paciente</h1>
      </div>

      <PatientForm
        defaultValues={patient.data}
        submitLabel="Guardar cambios"
        onCancel={() => router.push(`/doctor/pacientes/${id}`)}
        onSubmit={async (input) => {
          await updatePatient.mutateAsync(input);
          router.push(`/doctor/pacientes/${id}`);
        }}
      />
    </div>
  );
}
