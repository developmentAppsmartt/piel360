"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PatientForm } from "@/components/patients/patient-form";
import { ApiError } from "@/lib/api-error";
import { usePatient, useUpdatePatient } from "@/lib/queries/patients";

export default function AdminEditarPacientePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const patient = usePatient(id);
  const updatePatient = useUpdatePatient(id);

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

  const fullName = `${patient.data.firstName} ${patient.data.lastName}`.trim();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/admin/pacientes" className="hover:text-foreground">
            Pacientes
          </Link>{" "}
          ›{" "}
          <Link href={`/admin/pacientes/${id}`} className="hover:text-foreground">
            {fullName}
          </Link>{" "}
          › <span className="text-foreground">Perfil</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Perfil del paciente
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta y actualiza los datos del paciente.
        </p>
      </div>

      <PatientForm
        defaultValues={patient.data}
        submitLabel="Guardar cambios"
        onCancel={() => router.push(`/admin/pacientes/${id}`)}
        onSubmit={async (input) => {
          await updatePatient.mutateAsync(input);
          router.push(`/admin/pacientes/${id}`);
        }}
      />
    </div>
  );
}
