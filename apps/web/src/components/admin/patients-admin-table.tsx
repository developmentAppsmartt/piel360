"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import type { Patient } from "@/lib/queries/patients";

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
};

const columnHelper = createColumnHelper<Patient>();

const columns = [
  columnHelper.accessor("firstName", { header: "Nombre" }),
  columnHelper.accessor("lastName", { header: "Apellidos" }),
  columnHelper.accessor((row) => row.docNumber, {
    id: "document",
    header: "Documento",
    cell: (info) => {
      const row = info.row.original;
      if (!row.docNumber) return "—";
      return row.docType ? `${row.docType} ${row.docNumber}` : row.docNumber;
    },
  }),
  columnHelper.accessor("email", {
    header: "Correo electrónico",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("phone", {
    header: "Teléfono",
    cell: (info) => info.getValue() ?? "—",
  }),
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
  columnHelper.accessor("fitzpatrickType", {
    header: "Fototipo",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("lastSkinAgeYears", {
    header: "Salud de la piel",
    cell: (info) => {
      const years = info.getValue();
      return years != null ? `${Math.round(years)} años` : "—";
    },
  }),
  columnHelper.accessor("lastSkinAgeDifference", {
    header: "Diferencia",
    cell: (info) => {
      const diff = info.getValue();
      if (diff == null) return "—";
      return diff > 0 ? `+${diff}` : String(diff);
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Creado el",
    cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
  }),
];

export function PatientsAdminTable({ patients }: { patients: Patient[] }) {
  return (
    <DataTable
      columns={columns}
      data={patients}
      searchPlaceholder="Buscar paciente..."
      emptyMessage="Sin pacientes."
    />
  );
}
