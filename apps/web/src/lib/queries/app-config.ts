"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export interface AppConfig {
  id: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export function useAppConfig(key: string) {
  return useQuery({
    queryKey: ["app-config", key],
    queryFn: () => apiClientFetch<AppConfig>(`/app-config/${key}`),
    retry: false,
  });
}

export function useAllAppConfigs() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: () => apiClientFetch<AppConfig[]>("/app-config"),
  });
}

export function useUpdateAppConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiClientFetch<AppConfig>(`/admin/app-config/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ["app-config"] });
      qc.invalidateQueries({ queryKey: ["app-config", key] });
    },
  });
}
