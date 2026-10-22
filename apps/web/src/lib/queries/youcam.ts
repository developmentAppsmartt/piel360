"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";
import type { CreateAnalysisInput } from "@/lib/queries/analyses";

// POST /analisispiel360/analyses es fire-and-forget: solo devuelve el id, el
// resultado se obtiene después vía useAnalysis (GET /analyses/:id).
interface CreateAnalisisPiel360AnalysisResponse {
  analysisId: string;
}

export type CreateAnalisisPiel360AnalysisInput = CreateAnalysisInput;

export function useCreateAnalisisPiel360Analysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ image, ...fields }: CreateAnalisisPiel360AnalysisInput) => {
      const form = new FormData();
      form.append("image", image, "photo.jpg");
      form.append("patientId", fields.patientId);
      if (fields.bodyRegion) form.append("bodyRegion", fields.bodyRegion);
      if (fields.xCoord !== undefined) form.append("xCoord", String(fields.xCoord));
      if (fields.yCoord !== undefined) form.append("yCoord", String(fields.yCoord));
      if (fields.zCoord !== undefined) form.append("zCoord", String(fields.zCoord));

      return apiClientFetch<CreateAnalisisPiel360AnalysisResponse>("/analisispiel360/analyses", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patients", variables.patientId, "analyses"] });
    },
  });
}
