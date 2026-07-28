"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import type { Doctor } from "@/lib/queries/doctors";

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
};

const columnHelper = createColumnHelper<Doctor>();

const columns = [
  columnHelper.accessor((row) => row.user.email, {
    id: "email",
    header: "Correo electrónico",
  }),
  columnHelper.accessor("firstName", { header: "Nombre" }),
  columnHelper.accessor("lastName", { header: "Apellidos" }),
  columnHelper.accessor("birthDate", {
    header: "Fecha de nacimiento",
    cell: (info) => {
      const value = info.getValue();
      return value ? new Date(value).toLocaleDateString("es-CO") : "—";
    },
  }),
  columnHelper.accessor("gender", {
    header: "Género",
    cell: (info) => {
      const value = info.getValue();
      return value ? (GENDER_LABELS[value] ?? value) : "—";
    },
  }),
  columnHelper.accessor("phone", {
    header: "Teléfono",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("createdAt", {
    header: "Creado el",
    cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
  }),
];

export function DoctorsTable({ doctors }: { doctors: Doctor[] }) {
  return (
    <DataTable
      columns={columns}
      data={doctors}
      searchPlaceholder="Buscar doctor..."
      emptyMessage="Sin doctores."
      getRowHref={(row) => `/admin/doctores/${row.id}`}
    />
  );
}
