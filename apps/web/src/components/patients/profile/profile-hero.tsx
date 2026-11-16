import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Check, ChevronRight, Home, IdCard, Mail, Pencil, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/lib/queries/patients";
import { patientEditPath, patientsListPath, type PatientsPanel } from "@/lib/patients-panel";
import { AssignPatientDoctorButton } from "../assign-patient-doctor-button";
import { NewAnalysisDialog } from "../new-analysis-dialog";
import { PatientAvatar } from "../patient-avatar";
import { formatProfileDate } from "./profile-format";

/** Cabecera de la ficha: ruta, avatar, nombre, contacto, acciones y el rostro
 * del banner a la derecha (como la maqueta del cliente). */
export function ProfileHero({
  patient,
  panel,
  showNewAnalysis,
}: {
  patient: Patient;
  panel: PatientsPanel;
  showNewAnalysis: boolean;
}) {
  const fullName = `${patient.firstName} ${patient.lastName}`.trim();
  const document =
    patient.docType && patient.docNumber
      ? `${patient.docType} ${patient.docNumber}`
      : (patient.docNumber ?? "Sin documento");

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[34%] lg:block" aria-hidden>
        <Image
          src="/landing/rostro-malla.webp"
          alt=""
          fill
          sizes="360px"
          className="object-cover object-[60%_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/70 to-transparent" />
      </div>

      <nav aria-label="Ruta" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Home className="size-3.5" aria-hidden />
        <Link href={patientsListPath(panel)} className="hover:text-foreground">
          Pacientes
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-foreground">Ficha del paciente</span>
      </nav>

      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:pr-[30%]">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            <PatientAvatar
              firstName={patient.firstName}
              lastName={patient.lastName}
              thumbUrl={patient.avatarThumbUrl}
              className="size-20 text-2xl ring-4 ring-sky-50 dark:ring-sky-950"
            />
            <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-card">
              <Check className="size-3.5" aria-hidden />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{fullName}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                Activo
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                {formatProfileDate(patient.birthDate)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IdCard className="size-4" aria-hidden />
                {document}
              </span>
              {patient.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-4" aria-hidden />
                  {patient.email}
                </span>
              ) : null}
              {patient.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-4" aria-hidden />
                  {patient.phone}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 lg:absolute lg:top-0 lg:right-0 lg:mt-0">
        {showNewAnalysis && panel === "doctor" ? <NewAnalysisDialog patientId={patient.id} /> : null}
        {panel === "admin" ? <AssignPatientDoctorButton patient={patient} /> : null}
        <Button
          variant="outline"
          className="gap-1.5 bg-card"
          nativeButton={false}
          render={<Link href={patientEditPath(panel, patient.id)} />}
        >
          <Pencil className="size-4" />
          Editar perfil
        </Button>
      </div>
    </div>
  );
}
