"use client";

import { useMemo, useState, type ReactNode } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, PencilLine } from "lucide-react";
import { AnalysisDateFilterButton } from "@/components/analyses/analysis-date-filter";
import { AnalysisKindChip } from "@/components/analyses/analysis-kind-chip";
import { AnalysisRowActions } from "@/components/analyses/analysis-row-actions";
import { PatientAvatar } from "@/components/patients/patient-avatar";
import { DataTable } from "@/components/ui/data-table";
import {
  matchesAnalysisDate,
  type AnalysisDateFilter,
} from "@/lib/analysis-date-filter";
import { analysisProviderLabel } from "@/lib/analysis-provider-label";
import { analysisKind } from "@/lib/patient-comparison";
import type { AnalysisListItem } from "@/lib/queries/analyses";
import { cn } from "@/lib/utils";

type Tone = "danger" | "success" | "warning" | "neutral";

const STATUS_ICONS: Record<Tone, typeof CheckCircle2> = {
  danger: AlertCircle,
  success: CheckCircle2,
  warning: Clock3,
  neutral: PencilLine,
};

function StatusPill({ children, tone, withIcon }: { children: ReactNode; tone: Tone; withIcon: boolean }) {
  const Icon = STATUS_ICONS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "danger" && "bg-red-50 text-red-700",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
        tone === "neutral" && "bg-zinc-100 text-zinc-600",
      )}
    >
      {withIcon ? <Icon className="size-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

const columnHelper = createColumnHelper<AnalysisListItem>();

function buildColumns({
  modern,
  avatarFor,
  getHref,
  showActions,
}: {
  modern: boolean;
  avatarFor?: (patientId: string) => string | null;
  getHref: (row: AnalysisListItem) => string | null;
  showActions: boolean;
}) {
  const columns = [
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
              <PatientAvatar
                firstName={row.patient.firstName}
                lastName={row.patient.lastName}
                thumbUrl={avatarFor?.(row.patientId) ?? null}
                className="size-9 text-xs"
              />
              <span className="max-w-44 font-medium whitespace-normal text-foreground">{name}</span>
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
          <AnalysisKindChip kind={analysisKind(info.row.original)} label={info.getValue()} />
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
          return <StatusPill tone="danger" withIcon={modern}>Inválido</StatusPill>;
        }
        if (a.isConfirmed) {
          return (
            <StatusPill tone="success" withIcon={modern}>
              {a.isCorrected ? "Corregido" : "Confirmado"}
            </StatusPill>
          );
        }
        return <StatusPill tone="warning" withIcon={modern}>Pendiente</StatusPill>;
      },
    }),
    columnHelper.accessor("createdAt", {
      header: "Fecha",
      cell: (info) => {
        const text = new Date(info.getValue()).toLocaleString("es-CO", {
          dateStyle: "short",
          timeStyle: "short",
        });
        if (!modern) return text;
        return (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            {text}
          </span>
        );
      },
    }),
  ];
  if (!showActions) return columns;
  return [
    ...columns,
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <AnalysisRowActions
            href={getHref(a)}
            analysisId={a.id}
            canDownload={analysisKind(a) === "aesthetic" && a.isValid}
          />
        );
      },
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
  avatarFor,
  showActions = false,
}: {
  analyses: AnalysisListItem[];
  getHref?: (row: AnalysisListItem) => string | null;
  title?: string;
  variant?: "default" | "modern";
  /** Miniatura de la foto del paciente (variante `modern`). */
  avatarFor?: (patientId: string) => string | null;
  /** Columna «Acciones» con ver y descargar PDF. */
  showActions?: boolean;
}) {
  const modern = variant === "modern";
  const [dateFilter, setDateFilter] = useState<AnalysisDateFilter | null>(null);
  const visible = useMemo(
    () => analyses.filter((a) => matchesAnalysisDate(a.createdAt, dateFilter)),
    [analyses, dateFilter],
  );

  return (
    <DataTable
      columns={buildColumns({ modern, avatarFor, getHref, showActions })}
      data={visible}
      searchAside={
        <AnalysisDateFilterButton value={dateFilter} onChange={setDateFilter} />
      }
      searchPlaceholder="Buscar por paciente o diagnóstico..."
      emptyMessage="Sin análisis."
      getRowHref={getHref}
      initialSorting={[{ id: "createdAt", desc: true }]}
      variant={variant}
      title={title}
      rowChevron={!showActions}
    />
  );
}
