"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  PatientsListHeader,
  PatientsTable,
} from "@/components/patients/patients-table";
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
    <div className="space-y-6">
      <PatientsListHeader onNew={() => router.push("/doctor/pacientes/nuevo")} />

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando pacientes…</p>
      )}
      {error && !(error instanceof ApiError && error.status === 401) && (
        <p className="text-sm text-destructive">
          No se pudieron cargar los pacientes.
        </p>
      )}
      {data && <PatientsTable patients={data} panel="doctor" />}
    </div>
  );
}
