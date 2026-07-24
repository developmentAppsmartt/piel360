"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { Patient } from "@/lib/queries/patients";

const columnHelper = createColumnHelper<Patient>();

const columns = [
  columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
    id: "name",
    header: "Nombre",
  }),
  columnHelper.accessor("docNumber", {
    header: "Documento",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("phone", {
    header: "Teléfono",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("createdAt", {
    header: "Creado",
    cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
  }),
];

export function PatientsTable({ patients }: { patients: Patient[] }) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={patients}
        searchPlaceholder="Buscar paciente..."
        emptyMessage="Sin pacientes."
        getRowHref={(row) => `/doctor/pacientes/${row.id}`}
      />

      <div className="flex justify-end">
        <Button onClick={() => router.push("/doctor/pacientes/nuevo")}>Nuevo paciente</Button>
      </div>
    </div>
  );
}
