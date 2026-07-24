"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Plan } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => apiClientFetch<Plan[]>("/plans"),
  });
}

// GET /admin/plans — a diferencia del catálogo público (`usePlans`), incluye
// los planes inactivos y `_count.subscriptions`, necesario para advertir
// antes de borrar (Subscription.plan tiene onDelete: Cascade).
export interface PlanAdmin extends Plan {
  createdAt: string;
  updatedAt: string;
  _count: { subscriptions: number };
}

export interface PlanInput {
  name: string;
  analysisProviderId: string;
  analysisLimit: number;
  price: number;
  durationDays: number;
  isActive?: boolean;
  description?: string;
}

export interface AnalysisProvider {
  id: string;
  name: string;
  slug: string;
}

export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => apiClientFetch<PlanAdmin[]>("/admin/plans"),
  });
}

export function useAnalysisProviders() {
  return useQuery({
    queryKey: ["admin", "analysis-providers"],
    queryFn: () => apiClientFetch<AnalysisProvider[]>("/admin/analysis-providers"),
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlanInput) =>
      apiClientFetch<PlanAdmin>("/admin/plans", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
  });
}

export function useUpdatePlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PlanInput>) =>
      apiClientFetch<PlanAdmin>(`/admin/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch<void>(`/admin/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
  });
}
