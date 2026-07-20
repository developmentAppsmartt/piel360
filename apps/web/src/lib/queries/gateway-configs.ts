"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateGatewayConfigInput,
  GatewayConfigSafe,
  UpdateGatewayConfigInput,
} from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export function useGatewayConfigs() {
  return useQuery({
    queryKey: ["admin", "gateway-configs"],
    queryFn: () => apiClientFetch<GatewayConfigSafe[]>("/payments/admin/gateway-configs"),
  });
}

export function useCreateGatewayConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGatewayConfigInput) =>
      apiClientFetch<GatewayConfigSafe>("/payments/admin/gateway-configs", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "gateway-configs"] });
    },
  });
}

export function useUpdateGatewayConfig(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGatewayConfigInput) =>
      apiClientFetch<GatewayConfigSafe>(`/payments/admin/gateway-configs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "gateway-configs"] });
    },
  });
}
