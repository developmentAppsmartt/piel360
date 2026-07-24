"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

// Shapes de respuesta JSON de apps/api/src/patients — `id` es string porque el
// backend serializa BigInt a string (apps/api/src/common/bigint-json.polyfill.ts).
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  docType: string | null;
  docNumber: string | null;
  address: string | null;
  birthDate: string | null;
  gender: string | null;
  fitzpatrickType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Analysis {
  id: string;
  youcamTaskId: string | null;
  bodyRegion: string | null;
  isValid: boolean;
  aiDiagnosis: string | null;
  aiProbability: number | null;
  finalDiagnosis: string | null;
  isConfirmed: boolean;
  isCorrected: boolean;
  createdAt: string;
}

export interface PatientInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  docType?: string;
  docNumber?: string;
  address?: string;
}

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: () => apiClientFetch<Patient[]>("/patients"),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: () => apiClientFetch<Patient>(`/patients/${id}`),
  });
}

/** Para el rol `patient`, `GET /patients` devuelve solo su propio registro
 * (patients.service.ts#findAll) — se usa para resolver el propio `patientId`
 * sin necesitar un endpoint `/patients/me` dedicado. */
export function useMyPatient() {
  const query = usePatients();
  return { ...query, data: query.data?.[0] };
}

export function usePatientAnalyses(id: string) {
  return useQuery({
    queryKey: ["patients", id, "analyses"],
    queryFn: () => apiClientFetch<Analysis[]>(`/patients/${id}/analyses`),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientInput) =>
      apiClientFetch<Patient>("/patients", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientInput) =>
      apiClientFetch<Patient>(`/patients/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients", id] });
    },
  });
}
