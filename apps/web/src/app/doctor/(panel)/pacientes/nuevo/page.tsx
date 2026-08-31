"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PatientForm } from "@/components/patients/patient-form";
import { useCreatePatient } from "@/lib/queries/patients";

export default function NuevoPacientePage() {
  const router = useRouter();
  const createPatient = useCreatePatient();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/doctor/pacientes" className="hover:text-foreground">
            Pacientes
          </Link>{" "}
          › <span className="text-foreground">Nuevo paciente</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nuevo paciente</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Registra un paciente en tu cartera. Los campos de perfil dermatológico son opcionales y
          puedes completarlos después.
        </p>
      </div>

      <PatientForm
        submitLabel="Crear paciente"
        onCancel={() => router.push("/doctor/pacientes")}
        onSubmit={async (input) => {
          const patient = await createPatient.mutateAsync(input);
          router.push(`/doctor/pacientes/${patient.id}`);
        }}
      />
    </div>
  );
}
