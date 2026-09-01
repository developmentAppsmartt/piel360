"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export interface Subscription {
  id: string;
  status: "active" | "pending" | "cancelled";
  endsAt: string | null;
  wompiTransactionId: string | null;
  createdAt: string;
  remainingCredits: number;
  plan: {
    id: string;
    name: string;
    analysisLimit: number;
    durationDays: number;
    price: string;
    maxUsers?: number;
    modules?: string[];
    roleLimits?: Record<string, number>;
    provider: { slug: string; name: string };
  };
}

export function useMySubscriptions(enabled = true) {
  return useQuery({
    queryKey: ["me", "subscriptions"],
    queryFn: () => apiClientFetch<Subscription[]>("/me/subscriptions"),
    enabled,
  });
}

// GET /admin/subscriptions — shape distinta de `Subscription` (esa es la del
// propio usuario, `/me/subscriptions`): acá `user` viene incluido (con
// `select` explícito en el backend, sin el hash de contraseña) y no hay
// `remainingCredits` (ese cálculo es propio de la vista "consumo" del dueño).
export interface SubscriptionAdmin {
  id: string;
  status: "active" | "pending" | "cancelled";
  endsAt: string | null;
  wompiTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    accountKind: "empresa" | "profesional" | "paciente";
    accountKindLabel: string;
  };
  plan: {
    id: string;
    name: string;
    planType: "individual" | "business";
    analysisLimit: number;
    price: string;
    durationDays: number;
    maxUsers: number;
    modules: string[];
    roleLimits: Record<string, number>;
    analysisProviderIds: string[];
    provider: {
      id: string;
      name: string;
      slug: string;
      displayLabel?: string | null;
    };
    providers?: {
      id: string;
      name: string;
      slug: string;
      displayLabel?: string | null;
    }[];
  };
}

export interface SubscriptionInput {
  userId?: string;
  planId?: string;
  status?: "active" | "cancelled";
}

export function useAdminSubscriptions() {
  return useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: () => apiClientFetch<SubscriptionAdmin[]>("/admin/subscriptions"),
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubscriptionInput) =>
      apiClientFetch<SubscriptionAdmin>("/admin/subscriptions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "bolsa-unidades"] });
    },
  });
}

export function useUpdateSubscription(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SubscriptionInput>) =>
      apiClientFetch<SubscriptionAdmin>(`/admin/subscriptions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "bolsa-unidades"] });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch<void>(`/admin/subscriptions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
    },
  });
}
