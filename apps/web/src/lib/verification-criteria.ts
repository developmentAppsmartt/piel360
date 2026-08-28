import {
  ADDRESS_VERIFICATION_METHOD_LABELS,
  LOCATION_TYPE_LABELS,
  type AddressVerificationMethod,
  type AddressVerificationStatus,
  type LocationType,
} from "@piel360/shared";
import {
  isEnterpriseDoctor,
  type Doctor,
  type DoctorOrganization,
} from "@/lib/queries/doctors";

export type CriterionStatus = "fulfilled" | "in_review" | "pending";

export function formatFullAddress(
  d: Pick<Doctor, "address" | "city" | "country" | "department">,
  org?: DoctorOrganization | null,
) {
  const parts = [
    d.address?.trim() || org?.address?.trim(),
    d.city?.trim() || org?.city?.trim(),
    d.department?.trim() || org?.department?.trim(),
    d.country?.trim() || org?.country?.trim(),
  ].filter(Boolean);
  return parts.join(", ");
}

export function locationTypeLabel(
  locationType: string | null | undefined,
): string {
  if (!locationType) return "—";
  const key = locationType as LocationType;
  return LOCATION_TYPE_LABELS[key] ?? locationType;
}

export function addressVerificationMethodLabel(
  method: string | null | undefined,
): string {
  if (!method) return "—";
  const key = method as AddressVerificationMethod;
  return ADDRESS_VERIFICATION_METHOD_LABELS[key] ?? method;
}

export function googleMapsUrl(lat: string | number | null, lng: string | number | null) {
  if (lat == null || lng == null) return null;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return `https://www.google.com/maps?q=${la},${ln}`;
}

export function hasRegisteredAddress(d: Doctor) {
  const org = d.organization;
  const address = d.address?.trim() || org?.address?.trim();
  const lat = d.lat ?? org?.lat;
  const lng = d.lng ?? org?.lng;
  return Boolean(address) && lat != null && lng != null;
}

export function computeVerificationCriteria(d: Doctor) {
  const enterprise = isEnterpriseDoctor(d);
  const org = d.organization;

  const coherentInfo: CriterionStatus =
    d.firstName?.trim() &&
    d.lastName?.trim() &&
    (d.specialty?.trim() || enterprise) &&
    (d.docNumber?.trim() || d.medicalRegistry?.trim() || enterprise)
      ? "fulfilled"
      : "pending";

  const docsUploaded =
    Boolean(d.cedulaDocKey || d.cedulaDocUrl) &&
    Boolean(d.medicalRegistryDocKey || d.medicalRegistryDocUrl) &&
    Boolean(d.diplomaDocKey || d.diplomaDocUrl);

  const validDocs: CriterionStatus = docsUploaded ? "fulfilled" : "pending";

  let enterpriseData: CriterionStatus = "fulfilled";
  if (enterprise) {
    if (!org?.name?.trim() || !org?.ciiuCode?.trim()) {
      enterpriseData = "pending";
    } else if (
      !org.rutDocKey &&
      !org.existenceCertDocKey &&
      !org.legalRepCedulaDocKey
    ) {
      enterpriseData = "in_review";
    }
  }

  const addrStatus = (d.addressVerificationStatus ??
    "pending") as AddressVerificationStatus;
  let addressVerified: CriterionStatus = "pending";
  if (addrStatus === "verified") addressVerified = "fulfilled";
  else if (addrStatus === "in_review" || hasRegisteredAddress(d)) {
    addressVerified = "in_review";
  }

  return {
    coherentInfo,
    validDocs,
    enterpriseData,
    addressVerified,
    enterprise,
  };
}

export const ACCEPTED_LOCATION_TYPES: { id: LocationType; label: string }[] = [
  { id: "consultorio", label: "Consultorio médico" },
  { id: "spa", label: "Spa / Centro de estética" },
  { id: "clinica", label: "Clínica" },
  { id: "empresa_aliada", label: "Empresa aliada / Laboratorio" },
];
