"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import type { Doctor } from "@/lib/queries/doctors";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  verified: "Verificado",
  approved: "Aprobado",
  active: "Activo",
  rejected: "Rechazado",
};

const columnHelper = createColumnHelper<Doctor>();

const columns = [
  columnHelper.accessor((row) => row.user.email, {
    id: "email",
    header: "Correo",
  }),
  columnHelper.accessor("firstName", { header: "Nombre" }),
  columnHelper.accessor("lastName", { header: "Apellidos" }),
  columnHelper.accessor(
    (row) =>
      row.docType && row.docNumber
        ? `${row.docType} ${row.docNumber}`
        : (row.docNumber ?? "—"),
    { id: "doc", header: "Documento" },
  ),
  columnHelper.accessor("specialty", {
    header: "Especialidad",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("verificationStatus", {
    header: "Estado",
    cell: (info) => STATUS_LABELS[info.getValue()] ?? info.getValue(),
  }),
  columnHelper.accessor("createdAt", {
    header: "Registro",
    cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
  }),
];

export function PendingDoctorsTable({ doctors }: { doctors: Doctor[] }) {
  return (
    <DataTable
      columns={columns}
      data={doctors}
      searchPlaceholder="Buscar doctor…"
      emptyMessage="No hay doctores pendientes de validación."
      getRowHref={(row) => `/admin/verificacion/${row.id}`}
    />
  );
}
