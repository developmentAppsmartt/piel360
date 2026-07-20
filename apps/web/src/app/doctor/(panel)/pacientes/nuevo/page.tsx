"use client";

import { useRouter } from "next/navigation";
import { PatientForm } from "@/components/patients/patient-form";
import { useCreatePatient } from "@/lib/queries/patients";

export default function NuevoPacientePage() {
  const router = useRouter();
  const createPatient = useCreatePatient();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nuevo paciente</h1>
      <PatientForm
        submitLabel="Crear paciente"
        onSubmit={async (input) => {
          const patient = await createPatient.mutateAsync(input);
          router.push(`/doctor/pacientes/${patient.id}`);
        }}
      />
    </div>
  );
}
