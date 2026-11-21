"use client";

import {
  Activity,
  Baby,
  CalendarCheck,
  CalendarDays,
  Droplet,
  HeartPulse,
  IdCard,
  NotebookPen,
  Phone,
  ShieldCheck,
  Stethoscope,
  Sun,
  TrendingUp,
  Users,
  VenusAndMars,
} from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { docTypeLabel, patientSkinTypeLabel } from "@/lib/patient-form-options";
import { usePatientAnalyses, type Patient } from "@/lib/queries/patients";
import { chronologicalAgeYears, formatSignedYears } from "@/lib/skin-age";
import { birthTypeLabel, exerciseLabel, formatProfileDate, genderLabel } from "./profile-format";

/** Los cuatro datos de un vistazo bajo el nombre: edad, género, último
 * análisis y estado. El historial es la misma query que ya pide la página,
 * así que no hace otra petición. */
export function ProfileStatChips({ patient }: { patient: Patient }) {
  const age = chronologicalAgeYears(patient.birthDate, new Date());
  const { data: analyses } = usePatientAnalyses(patient.id);
  const lastAnalysisAt = analyses?.length
    ? analyses.reduce((latest, a) => (a.createdAt > latest ? a.createdAt : latest), analyses[0].createdAt)
    : null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile icon={Users} tone="blue" label="Edad" value={age != null ? `${age} años` : "—"} />
      <StatTile icon={VenusAndMars} tone="pink" label="Género" value={genderLabel(patient.gender)} />
      <StatTile
        icon={CalendarCheck}
        tone="orange"
        label="Último análisis"
        value={lastAnalysisAt ? formatProfileDate(lastAnalysisAt) : "Sin análisis"}
      />
      <StatTile
        icon={ShieldCheck}
        tone="emerald"
        label="Estado"
        value={<span className="text-emerald-600 dark:text-emerald-400">Activo</span>}
      />
    </div>
  );
}

/** Todos los datos de la ficha como tarjetas con ícono (los mismos que había
 * antes del rediseño, ninguno se quitó). */
export function ProfileDetailsGrid({ patient }: { patient: Patient }) {
  const items = [
    {
      icon: Stethoscope,
      label: "Profesional responsable",
      value:
        patient.professionalName?.trim() || (patient.doctorId ? `Doctor #${patient.doctorId}` : "Sin asignar"),
    },
    { icon: IdCard, label: "Tipo de documento", value: docTypeLabel(patient.docType) ?? "—" },
    { icon: Phone, label: "Teléfono", value: patient.phone ?? "—" },
    { icon: CalendarDays, label: "Fecha de nacimiento", value: formatProfileDate(patient.birthDate) },
    { icon: Droplet, label: "Tipo de piel", value: patientSkinTypeLabel(patient.skinType) },
    { icon: Activity, label: "Actividad física", value: exerciseLabel(patient.exerciseHabit) },
    {
      icon: HeartPulse,
      label: "Salud de la piel",
      value: patient.lastSkinAgeYears != null ? `${Math.round(patient.lastSkinAgeYears)} años` : "Sin análisis",
    },
    {
      icon: TrendingUp,
      label: "Diferencia de edad",
      value: patient.lastSkinAgeDifference != null ? formatSignedYears(patient.lastSkinAgeDifference) : "—",
    },
    { icon: Sun, label: "Fototipo", value: patient.fitzpatrickType ? `Tipo ${patient.fitzpatrickType}` : "Sin registrar" },
    { icon: CalendarCheck, label: "Paciente desde", value: formatProfileDate(patient.createdAt) },
    { icon: Baby, label: "Tipo de nacimiento", value: birthTypeLabel(patient.birthType) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <StatTile key={item.label} icon={item.icon} label={item.label} value={item.value} />
      ))}
      {patient.importantNotes?.trim() ? (
        <StatTile
          className="sm:col-span-2 lg:col-span-3"
          icon={NotebookPen}
          tone="amber"
          label="Notas importantes"
          value={<span className="text-sm font-medium whitespace-pre-wrap">{patient.importantNotes.trim()}</span>}
        />
      ) : null}
    </div>
  );
}
