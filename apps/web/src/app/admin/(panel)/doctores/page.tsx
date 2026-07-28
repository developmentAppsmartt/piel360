"use client";

import { DoctorsTable } from "@/components/admin/doctors-table";
import { useDoctors } from "@/lib/queries/doctors";

export default function DoctoresPage() {
  const doctors = useDoctors();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Doctores</h1>

      {doctors.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {doctors.error && <p className="text-destructive">No se pudo cargar la lista de doctores.</p>}
      {doctors.data && <DoctorsTable doctors={doctors.data} />}
    </div>
  );
}
