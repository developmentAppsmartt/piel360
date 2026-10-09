"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { YoucamScoreConfig } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

const KEY = ["doctor-score-config"] as const;

export function useMyScoreConfig() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClientFetch<YoucamScoreConfig>("/doctor/score-config"),
  });
}

export function useUpdateScoreConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: YoucamScoreConfig) =>
      apiClientFetch<YoucamScoreConfig>("/doctor/score-config", {
        method: "PUT",
        body: JSON.stringify(config),
      }),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}
