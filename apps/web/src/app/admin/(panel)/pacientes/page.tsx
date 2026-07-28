"use client";

import { PatientsAdminTable } from "@/components/admin/patients-admin-table";
import { usePatients } from "@/lib/queries/patients";

export default function PacientesPage() {
  const patients = usePatients();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pacientes</h1>

      {patients.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {patients.error && <p className="text-destructive">No se pudo cargar la lista de pacientes.</p>}
      {patients.data && <PatientsAdminTable patients={patients.data} />}
    </div>
  );
}
