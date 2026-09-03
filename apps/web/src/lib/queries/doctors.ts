"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

// Shape de GET /admin/doctors(/:id) — `id` es string por el polyfill de BigInt
// del backend. `user` viene incluido desde doctors.service.ts#findAll/findOne.
export interface Doctor {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
  docType: string | null;
  docNumber: string | null;
  phone: string | null;
  specialty: string | null;
  medicalRegistry: string | null;
  licenseNumber: string | null;
  educationEntity: string | null;
  graduationInstitution: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  country: string | null;
  zip: string | null;
  lat: string | number | null;
  lng: string | number | null;
  locationType?: string | null;
  addressVerificationStatus?: string | null;
  addressVerifiedAt?: string | null;
  addressVerificationMethod?: string | null;
  addressVerificationEvidenceKey?: string | null;
  addressVerificationEvidenceUrl?: string | null;
  verificationStatus: string;
  verificationNote?: string | null;
  verificationNoteAt?: string | null;
  membershipType?: string | null;
  empresa?: boolean;
  empresaReferida?: boolean;
  cedulaDocKey: string | null;
  medicalRegistryDocKey: string | null;
  diplomaDocKey: string | null;
  cedulaDocUrl?: string | null;
  medicalRegistryDocUrl?: string | null;
  diplomaDocUrl?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
  };
  /** Presente en verificación admin cuando es cuenta empresa / aliada. */
  organization?: DoctorOrganization | null;
}

export type DoctorOrganization = {
  id: string;
  type: string;
  name: string;
  status: string;
  ciiuCode: string | null;
  address?: string | null;
  city?: string | null;
  department?: string | null;
  country?: string | null;
  zip?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  businessEmail: string | null;
  businessPhone: string | null;
  website: string | null;
  employeeCountRange: string | null;
  legalRepName: string | null;
  legalRepDocType: string | null;
  legalRepDocNumber: string | null;
  legalRepCedulaDocKey: string | null;
  rutDocKey: string | null;
  existenceCertDocKey: string | null;
  legalRepCedulaDocUrl?: string | null;
  rutDocUrl?: string | null;
  existenceCertDocUrl?: string | null;
};

export function isEnterpriseDoctor(
  d: Pick<Doctor, "membershipType" | "empresa" | "empresaReferida">,
) {
  const type = (d.membershipType ?? "").trim().toLowerCase();
  return (
    type === "empresa" ||
    type === "empresa_aliada" ||
    Boolean(d.empresa) ||
    Boolean(d.empresaReferida)
  );
}

export function accountTypeLabel(
  d: Pick<Doctor, "membershipType" | "empresa" | "empresaReferida">,
) {
  if (!isEnterpriseDoctor(d)) return "Profesional";
  const type = (d.membershipType ?? "").trim().toLowerCase();
  if (type === "empresa_aliada" || d.empresaReferida) return "Enterprise aliada";
  return "Enterprise";
}

/** Bandejas del panel de verificación (mutuamente excluyentes). */
export const VERIFICATION_STATUS_GROUPS = {
  pending: ["pending", "in_review"],
  active: ["active", "approved", "verified"],
  rejected: ["rejected"],
} as const;

export type VerificationListStatus = keyof typeof VERIFICATION_STATUS_GROUPS;

export function matchesVerificationGroup(
  verificationStatus: string | null | undefined,
  group: VerificationListStatus,
): boolean {
  const s = (verificationStatus ?? "").trim().toLowerCase();
  return (VERIFICATION_STATUS_GROUPS[group] as readonly string[]).includes(s);
}

export type MyDoctorProfile = Doctor & {
  allowedProviderSlugs?: string[];
};

export interface DoctorInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  department?: string;
  country?: string;
  zip?: string;
  lat?: number;
  lng?: number;
}

export type DoctorProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneTicket?: string;
  docType?: string;
  docNumber?: string;
  birthDate?: string;
  gender?: string;
  specialty?: string;
  medicalRegistry?: string;
  licenseNumber?: string;
  educationEntity?: string;
  graduationInstitution?: string;
  address?: string;
  city?: string;
  department?: string;
  country?: string;
  zip?: string;
  lat?: number;
  lng?: number;
};

export function useMyDoctorProfile(enabled = true) {
  return useQuery({
    queryKey: ["doctors", "me"],
    queryFn: () => apiClientFetch<MyDoctorProfile>("/doctors/me"),
    enabled,
    retry: false,
  });
}

export function useUpdateMyDoctorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DoctorProfileInput) =>
      apiClientFetch<MyDoctorProfile>("/doctors/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["doctors", "me"], data);
      queryClient.invalidateQueries({ queryKey: ["doctors", "me"] });
    },
  });
}

export function useUploadDoctorDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) =>
      apiClientFetch<MyDoctorProfile>("/doctors/me/documents", {
        method: "POST",
        body: form,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["doctors", "me"], data);
    },
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: ["admin", "doctors"],
    queryFn: () => apiClientFetch<Doctor[]>("/admin/doctors"),
  });
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: ["admin", "doctors", id],
    queryFn: () => apiClientFetch<Doctor>(`/admin/doctors/${id}`),
    enabled: Boolean(id),
  });
}

export function useUpdateDoctor(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DoctorInput) =>
      apiClientFetch<Doctor>(`/admin/doctors/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors", id] });
    },
  });
}

export function usePendingVerificationDoctors(
  status: VerificationListStatus = "pending",
) {
  return useQuery({
    queryKey: ["admin", "verification", "doctors", status],
    queryFn: async () => {
      // Path param (no query) — cada bandeja es exclusiva
      const rows = await apiClientFetch<Doctor[]>(
        `/admin/verification/doctors/${encodeURIComponent(status)}`,
      );
      return rows.filter((d) =>
        matchesVerificationGroup(d.verificationStatus, status),
      );
    },
  });
}

export type VerificationStats = {
  pending: number;
  approved: number;
  rejected: number;
  totalVerified: number;
  verifiedToday: number;
  rejectedToday: number;
};

export function useVerificationStats() {
  return useQuery({
    queryKey: ["admin", "verification", "stats"],
    queryFn: () =>
      apiClientFetch<VerificationStats>("/admin/verification/stats"),
  });
}

export function useUpdateDoctorVerification(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      status: "active" | "rejected" | "in_review" | "pending";
      note?: string;
    }) =>
      apiClientFetch<Doctor>(`/admin/doctors/${id}/verification`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "verification"],
      });
    },
  });
}

export function useUpdateDoctorAddressVerification(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      status: "pending" | "in_review" | "verified";
      method?: "visit" | "google_maps" | "photo_evidence";
    }) =>
      apiClientFetch<Doctor>(`/admin/doctors/${id}/address-verification`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "verification"],
      });
    },
  });
}

export function useUploadAddressVerificationEvidence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("evidence", file);
      return apiClientFetch<Doctor>(
        `/admin/doctors/${id}/address-verification/evidence`,
        { method: "POST", body: form },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "verification"],
      });
    },
  });
}

export function useDeleteAddressVerificationEvidence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClientFetch<Doctor>(
        `/admin/doctors/${id}/address-verification/evidence`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "verification"],
      });
    },
  });
}
