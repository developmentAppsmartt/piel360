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
    provider: { slug: string; name: string };
  };
}

export function useMySubscriptions() {
  return useQuery({
    queryKey: ["me", "subscriptions"],
    queryFn: () => apiClientFetch<Subscription[]>("/me/subscriptions"),
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
  };
  plan: {
    id: string;
    name: string;
    provider: { name: string };
  };
}

export interface SubscriptionInput {
  userId: string;
  planId: string;
  status?: "active" | "pending" | "cancelled";
  endsAt?: string;
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
