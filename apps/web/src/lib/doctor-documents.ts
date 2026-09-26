/**
 * Documentos que se le piden a un profesional según su tipo. Antes las tres
 * tarjetas estaban hardcodeadas en cada pantalla (registro, perfil, dos vistas
 * de admin) con etiquetas distintas entre sí para el mismo archivo; ahora la
 * lista vive acá y todas la consumen.
 *
 * `field` es la clave del FormData que espera `POST /doctors/me/documents`, y
 * `docKey`/`docUrl` los campos que devuelve el API para ese documento.
 */

export type ProfessionalKind = "specialty" | "labor";

export interface DoctorDocumentDef {
  field: string;
  label: string;
  docKey:
    | "cedulaDocKey"
    | "medicalRegistryDocKey"
    | "diplomaDocKey"
    | "diplomaPostgradoDocKey"
    | "healthRegistrationDocKey"
    | "biosafetyCertDocKey";
  docUrl:
    | "cedulaDocUrl"
    | "medicalRegistryDocUrl"
    | "diplomaDocUrl"
    | "diplomaPostgradoDocUrl"
    | "healthRegistrationDocUrl"
    | "biosafetyCertDocUrl";
}

const SPECIALTY_DOCS: DoctorDocumentDef[] = [
  {
    field: "cedula",
    label: "Cédula",
    docKey: "cedulaDocKey",
    docUrl: "cedulaDocUrl",
  },
  {
    field: "medicalRegistryDoc",
    label: "Registro médico",
    docKey: "medicalRegistryDocKey",
    docUrl: "medicalRegistryDocUrl",
  },
  {
    field: "diploma",
    label: "Diploma pregrado",
    docKey: "diplomaDocKey",
    docUrl: "diplomaDocUrl",
  },
  {
    field: "diplomaPostgrado",
    label: "Diploma postgrado",
    docKey: "diplomaPostgradoDocKey",
    docUrl: "diplomaPostgradoDocUrl",
  },
];

const LABOR_DOCS: DoctorDocumentDef[] = [
  {
    field: "cedula",
    label: "Cédula (ambos lados en un archivo)",
    docKey: "cedulaDocKey",
    docUrl: "cedulaDocUrl",
  },
  {
    // Reutiliza la columna del registro médico: el técnico no tiene registro,
    // y el negocio pidió este documento "en vez de" aquel.
    field: "medicalRegistryDoc",
    label: "Diploma / Certificado de acreditación académica",
    docKey: "medicalRegistryDocKey",
    docUrl: "medicalRegistryDocUrl",
  },
  {
    field: "healthRegistration",
    label: "Inscripción sanitaria",
    docKey: "healthRegistrationDocKey",
    docUrl: "healthRegistrationDocUrl",
  },
  {
    field: "biosafetyCert",
    label: "Certificado de bioseguridad",
    docKey: "biosafetyCertDocKey",
    docUrl: "biosafetyCertDocUrl",
  },
];

/** Los registros anteriores al cambio no tienen `professionalKind`: se les
 * muestran los documentos de especialidad médica, que es lo que subieron. */
export function doctorDocuments(
  professionalKind: string | null | undefined,
): DoctorDocumentDef[] {
  return professionalKind === "labor" ? LABOR_DOCS : SPECIALTY_DOCS;
}

type DoctorDocumentFields = Partial<
  Record<DoctorDocumentDef["docKey"] | DoctorDocumentDef["docUrl"], string | null>
> & { professionalKind?: string | null };

/** Todos los documentos de su tipo están cargados (key o url firmada). */
export function hasAllDoctorDocuments(doctor: DoctorDocumentFields): boolean {
  return doctorDocuments(doctor.professionalKind).every((doc) =>
    Boolean(doctor[doc.docKey] || doctor[doc.docUrl]),
  );
}
