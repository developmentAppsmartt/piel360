"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

// POST /fitzpatrick/analyses es síncrono: espera el resultado dentro de la
// misma petición y devuelve el análisis ya completo.
interface CreateFitzpatrickAnalysisResponse {
  analysisId: string;
}

export interface CreateFitzpatrickAnalysisInput {
  patientId: string;
  image: Blob;
}

export function useCreateFitzpatrickAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, image }: CreateFitzpatrickAnalysisInput) => {
      const form = new FormData();
      form.append("image", image, "photo.jpg");
      form.append("patientId", patientId);

      return apiClientFetch<CreateFitzpatrickAnalysisResponse>("/fitzpatrick/analyses", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patients", variables.patientId, "analyses"] });
    },
  });
}
