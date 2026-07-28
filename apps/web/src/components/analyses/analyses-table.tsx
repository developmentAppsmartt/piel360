"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { AnalysisListItem } from "@/lib/queries/analyses";

const columnHelper = createColumnHelper<AnalysisListItem>();

const columns = [
  columnHelper.accessor((row) => `${row.patient.firstName} ${row.patient.lastName}`, {
    id: "patient",
    header: "Paciente",
  }),
  columnHelper.accessor((row) => (row.youcamTaskId ? "YouCam" : "Skiniver"), {
    id: "provider",
    header: "Proveedor",
    cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor((row) => row.finalDiagnosis ?? row.aiDiagnosis, {
    id: "diagnosis",
    header: "Diagnóstico",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.display({
    id: "status",
    header: "Estado",
    cell: ({ row }) => {
      const a = row.original;
      if (!a.isValid) return <Badge variant="destructive">Inválido</Badge>;
      if (a.isConfirmed) return <Badge>{a.isCorrected ? "Corregido" : "Confirmado"}</Badge>;
      return <Badge variant="secondary">Pendiente</Badge>;
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Fecha",
    cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
  }),
];

const defaultGetHref = (row: AnalysisListItem) =>
  `/doctor/pacientes/${row.patientId}/analisis/${row.id}`;

export function AnalysesTable({
  analyses,
  getHref = defaultGetHref,
}: {
  analyses: AnalysisListItem[];
  /** Devuelve la URL de destino al hacer click en una fila, o `null` para
   * desactivar la navegación en esa fila. Por defecto apunta a la vista de
   * detalle del panel doctor — se sobreescribe en contextos (ej. dashboard
   * admin) donde esa ruta no es accesible (`proxy.ts` la restringe a `doctor`). */
  getHref?: (row: AnalysisListItem) => string | null;
}) {
  return (
    <DataTable
      columns={columns}
      data={analyses}
      searchPlaceholder="Buscar por paciente o diagnóstico..."
      emptyMessage="Sin análisis."
      getRowHref={getHref}
      initialSorting={[{ id: "createdAt", desc: true }]}
    />
  );
}
