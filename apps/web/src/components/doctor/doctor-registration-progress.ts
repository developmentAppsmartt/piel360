import { isDoctorVerificationActive } from "@piel360/shared";
import type { Doctor } from "@/lib/queries/doctors";
import { isEnterpriseDoctor } from "@/lib/queries/doctors";
import type { OrgCompanyProfile } from "@/lib/queries/organizations";

export type RegistrationChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  pending?: boolean;
};

export function isProfessionalInfoComplete(
  profile: Doctor,
  org?: OrgCompanyProfile | null,
): boolean {
  const base = Boolean(
    profile.specialty?.trim() &&
      profile.medicalRegistry?.trim() &&
      profile.docNumber?.trim() &&
      profile.address?.trim(),
  );
  if (!isEnterpriseDoctor(profile)) return base;
  return (
    base &&
    Boolean(
      org?.name?.trim() &&
        org?.businessEmail?.trim() &&
        org?.legalRepName?.trim(),
    )
  );
}

export function isDocumentsComplete(
  profile: Doctor,
  org?: OrgCompanyProfile | null,
): boolean {
  const doctorDocs = Boolean(
    profile.cedulaDocKey &&
      profile.medicalRegistryDocKey &&
      profile.diplomaDocKey,
  );
  if (!isEnterpriseDoctor(profile)) return doctorDocs;
  return (
    doctorDocs &&
    Boolean(
      org?.legalRepCedulaDocKey &&
        org?.rutDocKey &&
        org?.existenceCertDocKey,
    )
  );
}

export function registrationChecklist(
  profile: Doctor,
  org?: OrgCompanyProfile | null,
): RegistrationChecklistItem[] {
  const profDone = isProfessionalInfoComplete(profile, org);
  const docsDone = isDocumentsComplete(profile, org);
  const status = (profile.verificationStatus ?? "pending").toLowerCase();
  const verified = isDoctorVerificationActive(profile.verificationStatus);
  const inReview = status === "in_review";
  const rejected = status === "rejected";

  return [
    {
      id: "professional",
      label: "Información profesional",
      done: profDone || verified,
    },
    {
      id: "documents",
      label: "Documentos requeridos",
      done: docsDone || verified,
    },
    {
      id: "verification",
      label: "Revisión y verificación",
      done: verified,
      pending: !verified && (inReview || (profDone && docsDone && !rejected)),
    },
  ];
}

/** 3 pasos del onboarding: app, registro completo, verificación. */
export function registrationProgressPercent(
  profile: Doctor,
  org?: OrgCompanyProfile | null,
): { percent: number; completed: number; total: number } {
  const total = 3;
  if (isDoctorVerificationActive(profile.verificationStatus)) {
    return { percent: 100, completed: total, total };
  }

  const profDone = isProfessionalInfoComplete(profile, org);
  const docsDone = isDocumentsComplete(profile, org);
  const registrationDone = profDone && docsDone;

  let completed = 1;
  if (registrationDone) completed += 1;
  if (registrationDone) completed += 1;

  const percent = Math.round((completed / total) * 100);
  return { percent, completed: registrationDone ? 2 : 1, total };
}
