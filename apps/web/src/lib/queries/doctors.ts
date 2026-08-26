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
  country: string | null;
  zip: string | null;
  lat: string | number | null;
  lng: string | number | null;
  verificationStatus: string;
  cedulaDocKey: string | null;
  medicalRegistryDocKey: string | null;
  diplomaDocKey: string | null;
  cedulaDocUrl?: string | null;
  medicalRegistryDocUrl?: string | null;
  diplomaDocUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
  };
}

export type MyDoctorProfile = Doctor;

export interface DoctorInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  zip?: string;
}

export type DoctorProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
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
  country?: string;
  zip?: string;
  lat?: number;
  lng?: number;
};

export function useMyDoctorProfile() {
  return useQuery({
    queryKey: ["doctors", "me"],
    queryFn: () => apiClientFetch<MyDoctorProfile>("/doctors/me"),
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

export function usePendingVerificationDoctors() {
  return useQuery({
    queryKey: ["admin", "verification", "doctors"],
    queryFn: () =>
      apiClientFetch<Doctor[]>("/admin/verification/doctors"),
  });
}

export function useUpdateDoctorVerification(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: "active" | "rejected") =>
      apiClientFetch<Doctor>(`/admin/doctors/${id}/verification`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "verification", "doctors"],
      });
    },
  });
}
