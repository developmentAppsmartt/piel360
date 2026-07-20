"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";
import type { CreateAnalysisInput } from "@/lib/queries/analyses";

// POST /youcam/analyses es fire-and-forget: solo devuelve el id, el
// resultado se obtiene después vía useAnalysis (GET /analyses/:id).
interface CreateYoucamAnalysisResponse {
  analysisId: string;
}

export function useCreateYoucamAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ image, ...fields }: CreateAnalysisInput) => {
      const form = new FormData();
      form.append("image", image, "photo.jpg");
      form.append("patientId", fields.patientId);
      if (fields.bodyRegion) form.append("bodyRegion", fields.bodyRegion);
      if (fields.xCoord !== undefined) form.append("xCoord", String(fields.xCoord));
      if (fields.yCoord !== undefined) form.append("yCoord", String(fields.yCoord));
      if (fields.zCoord !== undefined) form.append("zCoord", String(fields.zCoord));

      return apiClientFetch<CreateYoucamAnalysisResponse>("/youcam/analyses", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patients", variables.patientId, "analyses"] });
    },
  });
}
