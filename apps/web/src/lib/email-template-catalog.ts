import {
  BellRing,
  CalendarDays,
  FileText,
  PenLine,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { EmailTemplate } from "@/lib/queries/email-templates";

/** Las pestañas del listado de Plantillas de correo: una por tipo de correo
 * que de verdad envía la plataforma (no hay correos de promociones). */
export type TemplateTypeId =
  | "citas"
  | "recordatorios"
  | "resultados"
  | "pacientes"
  | "equipo"
  | "moderacion"
  | "personalizadas";

export const TEMPLATE_TYPES: Record<TemplateTypeId, { label: string; icon: LucideIcon; chip: string }> = {
  citas: {
    label: "Citas",
    icon: CalendarDays,
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  },
  recordatorios: {
    label: "Recordatorios",
    icon: BellRing,
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  },
  resultados: {
    label: "Resultados",
    icon: FileText,
    chip: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
  },
  pacientes: {
    label: "Pacientes",
    icon: UserPlus,
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  },
  equipo: {
    label: "Equipo",
    icon: Users,
    chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200",
  },
  moderacion: {
    label: "Moderación",
    icon: ShieldCheck,
    chip: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
  },
  personalizadas: {
    label: "Personalizadas",
    icon: PenLine,
    chip: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200",
  },
};

const EVENT_KINDS: Record<string, { type: TemplateTypeId; description: string }> = {
  appointment_scheduled: { type: "citas", description: "Confirma al paciente la cita que agendaste." },
  appointment_reminder: { type: "recordatorios", description: "Recuerda la cita al paciente unos días antes." },
  report_ready: { type: "resultados", description: "Envía al paciente el informe de su análisis." },
  patient_account_created: { type: "pacientes", description: "Bienvenida con los datos de acceso a la app." },
  patient_invitation: { type: "pacientes", description: "Invita al paciente a descargar la app." },
  team_member_invitation: { type: "equipo", description: "Invita a un profesional a tu equipo." },
  doctor_verification_approved: { type: "moderacion", description: "Avisa al profesional que su registro fue aprobado." },
  doctor_verification_changes_requested: {
    type: "moderacion",
    description: "Pide al profesional ajustes en su registro.",
  },
  doctor_verification_rejected: { type: "moderacion", description: "Avisa al profesional que su registro fue rechazado." },
};

export type TemplateRow = {
  /** `kind:<kind>` para los correos de evento, el id para las personalizadas. */
  key: string;
  /** El evento que dispara el correo; null en las personalizadas. */
  eventKind: string | null;
  /** La plantilla guardada; null si el evento usa el contenido por defecto. */
  templateId: string | null;
  name: string;
  type: TemplateTypeId;
  description: string;
  isActive: boolean;
};

/** Filas del listado: primero los eventos (con su personalización, si la hay)
 * y después las plantillas personalizadas. */
export function buildTemplateRows({
  eventKinds,
  templates,
  kindLabel,
}: {
  eventKinds: readonly string[];
  templates: EmailTemplate[];
  kindLabel: (kind: string) => string;
}): TemplateRow[] {
  const events = eventKinds.map((kind): TemplateRow => {
    const saved = templates.find((t) => t.kind === kind);
    return {
      key: `kind:${kind}`,
      eventKind: kind,
      templateId: saved?.id ?? null,
      name: saved?.name ?? kindLabel(kind),
      type: EVENT_KINDS[kind]?.type ?? "personalizadas",
      description: EVENT_KINDS[kind]?.description ?? "",
      // Sin personalizar, el correo sale con el contenido por defecto.
      isActive: saved?.isActive ?? true,
    };
  });
  const custom = templates
    .filter((t) => !eventKinds.includes(t.kind))
    .map(
      (t): TemplateRow => ({
        key: t.id,
        eventKind: null,
        templateId: t.id,
        name: t.name,
        type: "personalizadas",
        description: t.subject,
        isActive: t.isActive,
      }),
    );
  return [...events, ...custom];
}
