"use client";

import { usePatients } from "@/lib/queries/patients";
import {
  PatientsListHeader,
  PatientsTable,
} from "@/components/patients/patients-table";

export default function AdminPacientesPage() {
  const patients = usePatients();

  return (
    <div className="space-y-6">
      <PatientsListHeader
        description="Consulta el listado global de pacientes registrados en la plataforma. Haz clic en una fila para ver el detalle y comparaciones."
      />

      {patients.isLoading && (
        <p className="text-sm text-muted-foreground">Cargando pacientes…</p>
      )}
      {patients.error && (
        <p className="text-sm text-destructive">
          No se pudo cargar la lista de pacientes.
        </p>
      )}
      {patients.data && (
        <PatientsTable
          patients={patients.data}
          panel="admin"
          showNewButton={false}
        />
      )}
    </div>
  );
}
