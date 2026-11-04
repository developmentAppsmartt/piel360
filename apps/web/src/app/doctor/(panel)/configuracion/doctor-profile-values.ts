import type { MyDoctorProfile } from "@/lib/queries/doctors";

export const DOC_TYPES = ["CC", "CE", "TI", "PA"] as const;

export const GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
] as const;

export const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500 disabled:bg-muted";

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toCoord(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function profileToForm(p: MyDoctorProfile) {
  return {
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    docType: p.docType ?? "CC",
    docNumber: p.docNumber ?? "",
    gender: p.gender ?? "",
    birthDate: toDateInput(p.birthDate),
    specialty: p.specialty ?? "",
    medicalRegistry: p.medicalRegistry ?? "",
    licenseNumber: p.licenseNumber ?? "",
    educationEntity: p.educationEntity ?? "",
    graduationInstitution: p.graduationInstitution ?? "",
    technicalInstitution: p.technicalInstitution ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    department: p.department ?? "",
    country: p.country ?? "",
    zip: p.zip ?? "",
    lat: toCoord(p.lat),
    lng: toCoord(p.lng),
  };
}

export type DoctorProfileFormValues = ReturnType<typeof profileToForm>;

export type SetDoctorProfileField = <K extends keyof DoctorProfileFormValues>(
  key: K,
  value: DoctorProfileFormValues[K],
) => void;
