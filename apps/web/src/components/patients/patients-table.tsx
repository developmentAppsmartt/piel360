"use client";

import { useState } from "react";
import Link from "next/link";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Camera, Download, Mail, Plus, TrendingUp, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageBanner } from "@/components/ui/page-banner";
import { StatTile } from "@/components/ui/stat-tile";
import { ApiError } from "@/lib/api-error";
import type { OrgTeamMember } from "@/lib/queries/organizations";
import { useInvitePatient, type Patient } from "@/lib/queries/patients";
import { patientsListPath, type PatientsPanel } from "@/lib/patients-panel";
import { PatientAvatar } from "./patient-avatar";

function InvitePatientButton({ patient }: { patient: Patient }) {
  const invite = useInvitePatient();
  const [feedback, setFeedback] = useState<"ok" | "error" | null>(null);

  if (patient.userId || !patient.email) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={invite.isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setFeedback(null);
          invite.mutate(patient.id, {
            onSuccess: () => setFeedback("ok"),
            onError: () => setFeedback("error"),
          });
        }}
        className="gap-1.5"
      >
        <Mail className="size-3.5" />
        {invite.isPending ? "Enviando..." : "Invitar"}
      </Button>
      {feedback === "ok" ? (
        <span className="text-xs font-medium text-emerald-600">Enviada</span>
      ) : feedback === "error" ? (
        <span className="text-xs font-medium text-destructive">
          {invite.error instanceof ApiError ? invite.error.message : "Error"}
        </span>
      ) : null}
    </div>
  );
}

/** Altas del mes en curso (hora local del navegador). */
function countNewThisMonth(patients: Patient[]): number {
  const now = new Date();
  return patients.filter((p) => {
    const d = new Date(p.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
}

function buildColumns(basePath: string, showProfessionalColumn = false) {
  const columnHelper = createColumnHelper<Patient>();

  const columns: ColumnDef<Patient, unknown>[] = [
    columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
      id: "name",
      header: "Paciente",
      cell: (info) => {
        const row = info.row.original;
        const href = `${basePath}/${row.id}`;
        return (
          <Link href={href} className="flex items-center gap-3 hover:opacity-90">
            <PatientAvatar
              firstName={row.firstName}
              lastName={row.lastName}
              thumbUrl={row.avatarThumbUrl}
              className="size-10 text-xs"
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {row.firstName} {row.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.email ?? "Sin correo"}
              </p>
            </div>
          </Link>
        );
      },
    }) as ColumnDef<Patient, unknown>,
    columnHelper.accessor("docNumber", {
      header: "Documento",
      cell: (info) => {
        const row = info.row.original;
        if (!row.docNumber) return "—";
        return row.docType ? `${row.docType} ${row.docNumber}` : row.docNumber;
      },
    }) as ColumnDef<Patient, unknown>,
  ];

  if (showProfessionalColumn) {
    columns.push(
      columnHelper.accessor("professionalName", {
        header: "Profesional",
        cell: (info) => info.getValue() ?? "—",
      }) as ColumnDef<Patient, unknown>,
    );
  }

  columns.push(
    columnHelper.accessor("phone", {
      header: "Teléfono",
      cell: (info) => info.getValue() ?? "—",
    }) as ColumnDef<Patient, unknown>,
    columnHelper.accessor("fitzpatrickType", {
      header: "Fototipo",
      cell: (info) => {
        const v = info.getValue();
        return v ? (
          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200">
            Tipo {v}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    }) as ColumnDef<Patient, unknown>,
    columnHelper.accessor("createdAt", {
      header: "Registro",
      cell: (info) => (
        <span className="text-muted-foreground">
          {new Date(info.getValue()).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    }) as ColumnDef<Patient, unknown>,
    columnHelper.display({
      id: "status",
      header: "Estado",
      cell: () => (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          Activo
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => <InvitePatientButton patient={info.row.original} />,
    }),
  );

  return columns;
}

/** Solo lista. El boton "Nuevo paciente" vive en `PatientsListHeader`, que es
 * quien decide si la pantalla permite crear; tenerlo tambien aqui lo pintaba
 * dos veces en /doctor/pacientes. */
export function PatientsTable({
  patients,
  panel = "doctor",
  showProfessionalColumn = false,
}: {
  patients: Patient[];
  panel?: PatientsPanel;
  showProfessionalColumn?: boolean;
}) {
  const resolvedBase = patientsListPath(panel);

  const withFitzpatrick = patients.filter((p) => p.fitzpatrickType).length;
  const fitzpatrickPct = patients.length ? Math.round((withFitzpatrick / patients.length) * 100) : 0;
  const newThisMonth = countNewThisMonth(patients);
  const columns = buildColumns(resolvedBase, showProfessionalColumn);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={Users} label="Total de pacientes" value={patients.length} />
        <StatTile
          icon={Camera}
          tone="violet"
          label="Con fototipo registrado"
          value={
            <span className="flex items-center gap-2">
              {withFitzpatrick}
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {fitzpatrickPct} %
              </span>
            </span>
          }
        />
        <StatTile
          icon={UserPlus}
          tone="emerald"
          label="Nuevos este mes"
          value={
            <span className="flex items-center gap-2">
              {newThisMonth}
              <TrendingUp className="size-4 text-emerald-600" aria-hidden />
            </span>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={patients}
        variant="modern"
        title="Listado de pacientes"
        subtitle="Consulta, filtra y gestiona la información de tus pacientes"
        titleIcon={Users}
        searchPlaceholder="Buscar por nombre, correo o documento..."
        emptyMessage="Aún no hay pacientes registrados."
        getRowHref={(row) => `${resolvedBase}/${row.id}`}
      />
    </div>
  );
}

export function PatientsProfessionalFilter({
  members,
  value,
  onChange,
}: {
  members: OrgTeamMember[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-60 flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium text-muted-foreground">
        Profesional del equipo
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
      >
        <option value="all">Todos los profesionales</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name}
            {member.specialty ? ` · ${member.specialty}` : ""}
            {member.memberRole === "owner" ? " (titular)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PatientsListHeader({
  onNew,
  onExport,
  description,
}: {
  onNew?: () => void;
  /** Descarga en CSV la lista que se está viendo. */
  onExport?: () => void;
  description?: string;
}) {
  return (
    <PageBanner
      image
      icon={Users}
      title="Pacientes"
      subtitle={description ?? "Gestiona el historial clínico y consulta la información de tus pacientes."}
      actions={
        <>
          {onNew ? (
            <Button onClick={onNew} className="gap-1.5">
              <Plus className="size-4" />
              Nuevo paciente
            </Button>
          ) : null}
          {onExport ? (
            <Button variant="outline" onClick={onExport} className="gap-1.5 bg-card">
              <Download className="size-4" />
              Exportar lista
            </Button>
          ) : null}
        </>
      }
    />
  );
}
