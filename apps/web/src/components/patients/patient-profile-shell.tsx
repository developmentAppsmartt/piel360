import Link from "next/link";
import { Calendar, Mail, Pencil, Phone, Plus, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import type { Patient } from "@/lib/queries/patients";
import { chronologicalAgeYears, formatSignedYears } from "@/lib/skin-age";
import {
  patientEditPath,
  patientsListPath,
  type PatientsPanel,
} from "@/lib/patients-panel";
import { PatientDetailTabs } from "./patient-detail-tabs";

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}

function formatBirthDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PatientProfileShell({
  patient,
  children,
  panel = "doctor",
  showNewAnalysis = true,
}: {
  patient: Patient;
  children: React.ReactNode;
  panel?: PatientsPanel;
  showNewAnalysis?: boolean;
}) {
  const fullName = `${patient.firstName} ${patient.lastName}`.trim();
  const listPath = patientsListPath(panel);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        <Link href={listPath} className="hover:text-foreground">
          Pacientes
        </Link>{" "}
        › <span className="text-foreground">{fullName}</span>
      </p>

      <ModuleCard className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {initials(patient.firstName, patient.lastName)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {fullName}
                </h1>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  Activo
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {formatBirthDate(patient.birthDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className="size-3.5" />
                  {patient.docType && patient.docNumber
                    ? `${patient.docType} ${patient.docNumber}`
                    : (patient.docNumber ?? "Sin documento")}
                </span>
                {patient.email ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {patient.email}
                  </span>
                ) : null}
                {patient.phone ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    {patient.phone}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Edad cronológica</p>
                  <p className="font-medium">
                    {chronologicalAgeYears(patient.birthDate, new Date()) != null
                      ? `${chronologicalAgeYears(patient.birthDate, new Date())} años`
                      : "Sin registrar"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Salud de la piel</p>
                  <p className="font-medium">
                    {patient.lastSkinAgeYears != null
                      ? `${Math.round(patient.lastSkinAgeYears)} años`
                      : "Sin análisis"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diferencia de edad</p>
                  <p className="font-medium">
                    {patient.lastSkinAgeDifference != null
                      ? formatSignedYears(patient.lastSkinAgeDifference)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fototipo</p>
                  <p className="font-medium">
                    {patient.fitzpatrickType
                      ? `Tipo ${patient.fitzpatrickType}`
                      : "Sin registrar"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paciente desde</p>
                  <p className="font-medium">
                    {new Date(patient.createdAt).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de piel</p>
                  <p className="font-medium">{patient.skinType ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de nacimiento</p>
                  <p className="font-medium">
                    {patient.birthType === "cesarean"
                      ? "Cesárea"
                      : patient.birthType === "normal"
                        ? "Normal"
                        : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actividad física</p>
                  <p className="font-medium">
                    {patient.exerciseHabit === "regular"
                      ? "Regular"
                      : patient.exerciseHabit === "sometimes"
                        ? "A veces"
                        : patient.exerciseHabit === "never"
                          ? "Nunca"
                          : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {showNewAnalysis && panel === "doctor" ? (
              <Button
                nativeButton={false}
                render={
                  <Link href={`/doctor/pacientes/${patient.id}/nuevo-analisis-youcam`} />
                }
                className="gap-1.5"
              >
                <Plus className="size-4" />
                Nuevo análisis
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href={patientEditPath(panel, patient.id)} />}
            >
              <Pencil className="size-4" />
              Ver y editar perfil
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <PatientDetailTabs patientId={patient.id} panel={panel} />
        </div>
      </ModuleCard>

      {children}
    </div>
  );
}
