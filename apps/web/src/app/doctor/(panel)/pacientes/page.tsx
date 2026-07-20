"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PatientsTable } from "@/components/patients/patients-table";
import { ApiError } from "@/lib/api-error";
import { usePatients } from "@/lib/queries/patients";

export default function PacientesPage() {
  const router = useRouter();
  const { data, isLoading, error } = usePatients();

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.push("/doctor/login");
    }
  }, [error, router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pacientes</h1>

      {isLoading && <p className="text-muted-foreground">Cargando pacientes...</p>}
      {error && !(error instanceof ApiError && error.status === 401) && (
        <p className="text-destructive">No se pudieron cargar los pacientes.</p>
      )}
      {data && <PatientsTable patients={data} />}
    </div>
  );
}
