"use client";

import type { ReactNode } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { analysisProviderLabel } from "@/lib/analysis-provider-label";
import type { AnalysisListItem } from "@/lib/queries/analyses";
import { cn } from "@/lib/utils";

function patientInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "—";
}

function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "danger" | "success" | "warning" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "danger" && "bg-red-50 text-red-700",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
        tone === "neutral" && "bg-zinc-100 text-zinc-600",
      )}
    >
      {children}
    </span>
  );
}

const columnHelper = createColumnHelper<AnalysisListItem>();

function buildColumns(modern: boolean) {
  return [
    columnHelper.accessor(
      (row) => `${row.patient.firstName} ${row.patient.lastName}`,
      {
        id: "patient",
        header: "Paciente",
        cell: (info) => {
          const row = info.row.original;
          const name = info.getValue();
          if (!modern) return name;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {patientInitials(row.patient.firstName, row.patient.lastName)}
              </div>
              <span className="font-medium text-foreground">{name}</span>
            </div>
          );
        },
      },
    ),
    columnHelper.accessor((row) => analysisProviderLabel(row), {
      id: "provider",
      header: "Tipo de análisis",
      cell: (info) =>
        modern ? (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ) : (
          info.getValue()
        ),
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
        if (!a.isValid) {
          return <StatusPill tone="danger">Inválido</StatusPill>;
        }
        if (a.isConfirmed) {
          return (
            <StatusPill tone="success">
              {a.isCorrected ? "Corregido" : "Confirmado"}
            </StatusPill>
          );
        }
        return <StatusPill tone="warning">Pendiente</StatusPill>;
      },
    }),
    columnHelper.accessor("createdAt", {
      header: "Fecha",
      cell: (info) =>
        new Date(info.getValue()).toLocaleString("es-CO", {
          dateStyle: "short",
          timeStyle: "short",
        }),
    }),
  ];
}

const defaultGetHref = (row: AnalysisListItem) =>
  `/doctor/pacientes/${row.patientId}/analisis/${row.id}`;

export function AnalysesTable({
  analyses,
  getHref = defaultGetHref,
  title,
  variant = "default",
}: {
  analyses: AnalysisListItem[];
  getHref?: (row: AnalysisListItem) => string | null;
  title?: string;
  variant?: "default" | "modern";
}) {
  const modern = variant === "modern";

  return (
    <DataTable
      columns={buildColumns(modern)}
      data={analyses}
      searchPlaceholder="Buscar por paciente o diagnóstico..."
      emptyMessage="Sin análisis."
      getRowHref={getHref}
      initialSorting={[{ id: "createdAt", desc: true }]}
      variant={variant}
      title={title}
    />
  );
}
