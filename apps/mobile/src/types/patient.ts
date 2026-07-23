/**
 * Perfil paciente — alineado a tabla `patients` (Prisma / Postgres).
 * Los nombres van en camelCase como serializa el API.
 */
export type PatientProfile = {
  id: string;
  doctorId: string | null;
  userId: string | null;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  areaCode: string | null;
  docType: string | null;
  docNumber: string | null;
  address: string | null;
  mascotType: string | null;
  skinType: string | null;
  fitzpatrickType: string | null;
  lat: number | null;
  lng: number | null;
  regions: unknown | null;
  surveyCompletedAt: string | null;
  surveyResponses: unknown | null;
  createdAt: string;
  updatedAt: string;
};

/** Subconjunto editable / visible en Mi Perfil (sin ids ni geo internos). */
export type PatientProfileDisplay = Pick<
  PatientProfile,
  | 'firstName'
  | 'lastName'
  | 'birthDate'
  | 'gender'
  | 'email'
  | 'phone'
  | 'areaCode'
  | 'docType'
  | 'docNumber'
  | 'address'
  | 'mascotType'
  | 'skinType'
  | 'fitzpatrickType'
  | 'surveyCompletedAt'
>;

export function patientDisplayName(p: Pick<PatientProfile, 'firstName' | 'lastName'>): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || 'Paciente';
}

export function formatPatientPhone(
  areaCode: string | null | undefined,
  phone: string | null | undefined,
): string | null {
  if (!phone?.trim()) return null;
  if (areaCode?.trim()) return `${areaCode.trim()} ${phone.trim()}`;
  return phone.trim();
}

export function formatPatientDocument(
  docType: string | null | undefined,
  docNumber: string | null | undefined,
): string | null {
  if (!docNumber?.trim()) return null;
  if (docType?.trim()) return `${docType.trim()} ${docNumber.trim()}`;
  return docNumber.trim();
}
