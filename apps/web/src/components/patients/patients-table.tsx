"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ModuleCard, ModuleMetric } from "@/components/ui/module-card";
import type { OrgTeamMember } from "@/lib/queries/organizations";
import type { Patient } from "@/lib/queries/patients";
import { patientsListPath, type PatientsPanel } from "@/lib/patients-panel";

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}

function buildColumns(basePath: string, showProfessionalColumn = false) {
  const columnHelper = createColumnHelper<Patient>();

  const columns = [
    columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
      id: "name",
      header: "Paciente",
      cell: (info) => {
        const row = info.row.original;
        const href = `${basePath}/${row.id}`;
        return (
          <Link href={href} className="flex items-center gap-3 hover:opacity-90">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {initials(row.firstName, row.lastName)}
            </div>
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
    }),
    columnHelper.accessor("docNumber", {
      header: "Documento",
      cell: (info) => {
        const row = info.row.original;
        if (!row.docNumber) return "—";
        return row.docType ? `${row.docType} ${row.docNumber}` : row.docNumber;
      },
    }),
  ];

  if (showProfessionalColumn) {
    columns.push(
      columnHelper.accessor("professionalName", {
        header: "Profesional",
        cell: (info) => info.getValue() ?? "—",
      }),
    );
  }

  columns.push(
    columnHelper.accessor("phone", {
      header: "Teléfono",
      cell: (info) => info.getValue() ?? "—",
    }),
    columnHelper.accessor("fitzpatrickType", {
      header: "Fototipo",
      cell: (info) => {
        const v = info.getValue();
        return v ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Tipo {v}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    }),
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
    }),
    columnHelper.display({
      id: "status",
      header: "Estado",
      cell: () => (
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          Activo
        </span>
      ),
    }),
  );

  return columns;
}

export function PatientsTable({
  patients,
  panel = "doctor",
  showNewButton = true,
  showProfessionalColumn = false,
}: {
  patients: Patient[];
  panel?: PatientsPanel;
  showNewButton?: boolean;
  showProfessionalColumn?: boolean;
}) {
  const router = useRouter();
  const resolvedBase = patientsListPath(panel);

  const withFitzpatrick = patients.filter((p) => p.fitzpatrickType).length;
  const columns = buildColumns(resolvedBase, showProfessionalColumn);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <ModuleCard className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total pacientes
              </p>
              <ModuleMetric className="mt-1 text-2xl">{patients.length}</ModuleMetric>
            </div>
          </div>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Con fototipo registrado
          </p>
          <ModuleMetric className="mt-2 text-2xl">{withFitzpatrick}</ModuleMetric>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Nuevos este mes
          </p>
          <ModuleMetric className="mt-2 text-2xl">
            {
              patients.filter((p) => {
                const d = new Date(p.createdAt);
                const now = new Date();
                return (
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear()
                );
              }).length
            }
          </ModuleMetric>
        </ModuleCard>
      </div>

      <DataTable
        columns={columns}
        data={patients}
        variant="modern"
        title="Listado de pacientes"
        searchPlaceholder="Buscar por nombre, correo o documento..."
        emptyMessage="Aún no hay pacientes registrados."
        getRowHref={(row) => `${resolvedBase}/${row.id}`}
      />

      {showNewButton && panel === "doctor" ? (
        <div className="flex justify-end">
          <Button
            onClick={() => router.push("/doctor/pacientes/nuevo")}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Nuevo paciente
          </Button>
        </div>
      ) : null}
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
  description,
}: {
  onNew?: () => void;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1>Pacientes</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {description ??
            "Gestiona tu cartera de pacientes, consulta su historial y compara la evolución de sus análisis de piel."}
        </p>
      </div>
      {onNew ? (
        <Button onClick={onNew} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Nuevo paciente
        </Button>
      ) : null}
    </div>
  );
}
