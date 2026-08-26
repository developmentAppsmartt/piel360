"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SkiniverPrediction, YouCamResults } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";
import type { YouCamAnalysisError } from "@/lib/queries/analyses";

// Shapes de respuesta JSON de apps/api/src/patients — `id` es string porque el
// backend serializa BigInt a string (apps/api/src/common/bigint-json.polyfill.ts).
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  areaCode: string | null;
  docType: string | null;
  docNumber: string | null;
  address: string | null;
  birthDate: string | null;
  gender: string | null;
  mascotType: string | null;
  skinType: string | null;
  fitzpatrickType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Analysis {
  id: string;
  youcamTaskId: string | null;
  bodyRegion: string | null;
  imagePath: string | null;
  coloredS3Url: string | null;
  isValid: boolean;
  aiDiagnosis: string | null;
  aiProbability: number | null;
  aiRawResponse?: unknown;
  finalDiagnosis: string | null;
  isConfirmed: boolean;
  isCorrected: boolean;
  doctorNotes: string | null;
  createdAt: string;
  // Puede faltar en filas creadas antes de que providerId se empezara a
  // guardar — ver apps/web/src/lib/analysis-provider-label.ts para el fallback.
  provider?: { displayLabel: string | null } | null;
}

/** Fila devuelta por `GET /patients/:id/analyses?withCoords=true` — solo
 * análisis con coordenadas 3D guardadas (historial 3D). imageUrl/coloredUrl/
 * maskedUrl/masks son URLs firmadas agregadas por AnalysisImageUrlsService
 * (mismo shape que AnalysisDetail en queries/analyses.ts). */
export interface Analysis3D {
  id: string;
  bodyRegion: string | null;
  xCoord: number;
  yCoord: number;
  zCoord: number;
  aiDiagnosis: string | null;
  finalDiagnosis: string | null;
  aiRawResponse: SkiniverPrediction | YouCamResults | YouCamAnalysisError | null;
  imageUrl: string | null;
  coloredUrl: string | null;
  maskedUrl: string | null;
  masks: { type: string; region?: string; url: string }[];
  hasOriginalPhoto: boolean;
  createdAt: string;
}

export interface PatientInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  areaCode?: string;
  docType?: string;
  docNumber?: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  mascotType?: string;
  skinType?: string;
  fitzpatrickType?: string;
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

export function usePatientAnalyses3D(id: string) {
  return useQuery({
    queryKey: ["patients", id, "analyses", "3d"],
    queryFn: () => apiClientFetch<Analysis3D[]>(`/patients/${id}/analyses?withCoords=true`),
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
