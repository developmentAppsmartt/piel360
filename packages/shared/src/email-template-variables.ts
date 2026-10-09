/**
 * Variables "del sistema" insertables en las plantillas de
 * `apps/doctor/(panel)/plantillas-correo` — una sola fuente de verdad para
 * que el preview del editor (`email-templates-workspace.tsx`) y la
 * sustitución real al enviar (`apps/api/src/reports/report-email.service.ts`)
 * usen exactamente las mismas claves. Distintas de las `EmailTemplateVariable`
 * que cada doctor crea a mano (esas sí son solo suyas).
 */

export interface SystemEmailVariable {
  /** Token literal insertado en el HTML, ej. "{nombre}". */
  key: string;
  description: string;
  /** Valor de muestra usado únicamente en el preview del editor. */
  sampleValue: string;
}

export const SYSTEM_EMAIL_VARIABLES: SystemEmailVariable[] = [
  // Estas tres se describían como "del paciente". Ya no lo son siempre: la
  // invitación a un miembro del equipo va dirigida a un profesional. Es la
  // misma variable —el destinatario—, así que se amplía la descripción en
  // vez de duplicarla con otro nombre.
  { key: "{nombre}", description: "Nombre del destinatario", sampleValue: "Ana" },
  { key: "{apellido}", description: "Apellido del destinatario", sampleValue: "García" },
  { key: "{email}", description: "Correo del destinatario", sampleValue: "ana@ejemplo.com" },
  {
    key: "{report_url}",
    description: "Link al reporte del análisis en PDF",
    sampleValue: "#",
  },
  {
    key: "{clinic_name}",
    description: "Nombre del doctor/clínica que envía el correo",
    sampleValue: "Piel360 Clínica",
  },
  { key: "{fecha_cita}", description: "Fecha de la cita agendada", sampleValue: "12 de septiembre de 2026" },
  { key: "{hora_cita}", description: "Hora de la cita agendada", sampleValue: "10:00 a. m." },
  { key: "{cita_titulo}", description: "Título/motivo de la cita", sampleValue: "Consulta" },
  // Invitación a un miembro del equipo.
  {
    key: "{clave_temporal}",
    description: "Clave temporal del miembro invitado",
    sampleValue: "Temp1234*",
  },
  {
    key: "{url_registro}",
    description: "Link para que el invitado entre y complete su registro",
    sampleValue: "#",
  },
  {
    key: "{rol_profesional}",
    description: "Especialidad o perfil técnico del invitado",
    sampleValue: "Dermatólogo",
  },
  {
    key: "{correo_soporte}",
    description: "Correo de contacto de la empresa que invita",
    sampleValue: "contacto@clinica.com",
  },
];

/** Sustitución literal (no regex) — igual criterio que ya usaba el preview
 * del editor: reemplaza cada `{key}` tal cual aparezca en el texto. */
export function applyEmailTemplateVariables(
  text: string,
  values: Record<string, string>,
): string {
  let out = text;
  for (const [key, value] of Object.entries(values)) {
    out = out.split(key).join(value);
  }
  return out;
}
