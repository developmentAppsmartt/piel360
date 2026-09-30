"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { analysisProviderLabel } from "@/lib/analysis-provider-label";
import { bodyRegionLabel } from "@/lib/body-regions";
import { formatAnalysisDate } from "@/lib/patient-comparison";
import type { Analysis } from "@/lib/queries/patients";

/**
 * Historial de análisis de un paciente. No reusa AnalysesTable porque aquel
 * muestra una columna "Paciente" que acá sobra —y que `Analysis` ni siquiera
 * trae— y le falta la columna "Región".
 */

type AnalysisStatus = "Inválido" | "Corregido" | "Confirmado" | "Pendiente";

function analysisStatus(a: Analysis): AnalysisStatus {
  if (!a.isValid) return "Inválido";
  if (!a.isConfirmed) return "Pendiente";
  return a.isCorrected ? "Corregido" : "Confirmado";
}

const columnHelper = createColumnHelper<Analysis>();

const columns = [
  columnHelper.accessor((row) => analysisProviderLabel(row), {
    id: "provider",
    header: "Tipo de análisis",
    cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor((row) => bodyRegionLabel(row.bodyRegion) ?? "—", {
    id: "bodyRegion",
    header: "Región",
  }),
  columnHelper.accessor((row) => row.finalDiagnosis ?? row.aiDiagnosis ?? "—", {
    id: "diagnosis",
    header: "Diagnóstico",
  }),
  // Accessor y no `display`: así la columna también se puede ordenar.
  columnHelper.accessor(analysisStatus, {
    id: "status",
    header: "Estado",
    cell: (info) => {
      const status = info.getValue();
      if (status === "Inválido") {
        return <Badge variant="destructive">Inválido</Badge>;
      }
      if (status === "Pendiente") {
        return <Badge variant="secondary">Pendiente</Badge>;
      }
      return <Badge>{status}</Badge>;
    },
  }),
  // El accessor devuelve el ISO crudo, que ordena cronológicamente; el `cell`
  // es el que lo formatea.
  columnHelper.accessor("createdAt", {
    header: "Fecha",
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatAnalysisDate(info.getValue())}
      </span>
    ),
  }),
];

export function PatientAnalysesTable({
  analyses,
  getRowHref,
}: {
  analyses: Analysis[];
  getRowHref?: (row: Analysis) => string | null;
}) {
  return (
    <DataTable
      columns={columns}
      data={analyses}
      title="Historial de análisis"
      variant="modern"
      searchPlaceholder="Buscar por diagnóstico o región..."
      emptyMessage="Este paciente aún no tiene análisis."
      getRowHref={getRowHref}
      // Lo más reciente primero; el encabezado permite invertirlo.
      initialSorting={[{ id: "createdAt", desc: true }]}
    />
  );
}
