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
  { key: "{nombre}", description: "Nombre del paciente", sampleValue: "Ana" },
  { key: "{apellido}", description: "Apellido del paciente", sampleValue: "García" },
  { key: "{email}", description: "Correo del paciente", sampleValue: "ana@ejemplo.com" },
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
