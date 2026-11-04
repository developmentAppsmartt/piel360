"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PatientClinicalHistory,
  PatientClinicalHistoryInput,
} from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export type ClinicalHistoryGroups = PatientClinicalHistory["groups"];

/** Preguntas Sí/No sin responder, para el alta (todavía no hay paciente). */
export function useClinicalHistoryCatalog(enabled: boolean) {
  return useQuery({
    queryKey: ["clinical-history", "catalog"],
    queryFn: () => apiClientFetch<ClinicalHistoryGroups>("/clinical-history/catalog"),
    enabled,
    staleTime: Infinity,
  });
}

export function usePatientClinicalHistory(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patients", patientId, "clinical-history"],
    queryFn: () =>
      apiClientFetch<PatientClinicalHistory>(`/patients/${patientId}/clinical-history`),
    enabled: Boolean(patientId),
  });
}

export function useSavePatientClinicalHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, input }: { patientId: string; input: PatientClinicalHistoryInput }) =>
      apiClientFetch<PatientClinicalHistory>(`/patients/${patientId}/clinical-history`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: (data, { patientId }) => {
      queryClient.setQueryData(["patients", patientId, "clinical-history"], data);
    },
  });
}
