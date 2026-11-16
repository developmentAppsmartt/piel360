import { downloadCsv } from "@/lib/csv-export";
import type { Patient } from "@/lib/queries/patients";

/** «Exportar lista» de Pacientes: las filas que se ven, como CSV. */
export function exportPatientsCsv(patients: Patient[], includeProfessional: boolean): void {
  const header = [
    "Nombre",
    "Documento",
    "Correo",
    "Teléfono",
    "Fototipo",
    "Registro",
    ...(includeProfessional ? ["Profesional"] : []),
  ];
  const rows = patients.map((p) => [
    `${p.firstName} ${p.lastName}`.trim(),
    p.docNumber ? `${p.docType ?? ""} ${p.docNumber}`.trim() : "",
    p.email ?? "",
    p.phone ?? "",
    p.fitzpatrickType ? `Tipo ${p.fitzpatrickType}` : "",
    new Date(p.createdAt).toLocaleDateString("es-CO"),
    ...(includeProfessional ? [p.professionalName ?? ""] : []),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(`pacientes-${today}.csv`, [header, ...rows]);
}
