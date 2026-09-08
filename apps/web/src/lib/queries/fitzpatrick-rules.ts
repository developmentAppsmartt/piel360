"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FitzpatrickScale } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export type FitzpatrickRulePriority = "low" | "medium" | "high" | "very_high";
export type FitzpatrickRuleColorKey = "green" | "blue" | "orange" | "amber" | "red";

export interface FitzpatrickRule {
  id: string;
  doctorId: string;
  label: string;
  description: string | null;
  fitzpatrickScale: FitzpatrickScale;
  priority: FitzpatrickRulePriority;
  colorKey: FitzpatrickRuleColorKey;
  sortOrder: number;
  isActive: boolean;
  routineIds: string[];
  treatmentIds: string[];
  productGroupIds: string[];
  supplementGroupIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FitzpatrickRuleInput {
  label: string;
  description?: string;
  fitzpatrickScale: FitzpatrickScale;
  priority?: FitzpatrickRulePriority;
  colorKey?: FitzpatrickRuleColorKey;
  sortOrder?: number;
  isActive?: boolean;
  routineIds?: string[];
  treatmentIds?: string[];
  productGroupIds?: string[];
  supplementGroupIds?: string[];
}

export interface FitzpatrickRuleGroupPreview {
  id: string;
  name: string;
  description: string | null;
  items?: {
    id: string;
    productId: string;
    productName: string;
    productType: string;
    note: string | null;
  }[];
  stepsCount?: number;
}

export interface FitzpatrickSimulationResult {
  snapshot: {
    fitzpatrickScale: string | null;
    message: string | null;
  };
  matchedRule: FitzpatrickRule | null;
  recommendations: {
    routines: FitzpatrickRuleGroupPreview[];
    treatments: FitzpatrickRuleGroupPreview[];
    products: FitzpatrickRuleGroupPreview[];
    supplements: FitzpatrickRuleGroupPreview[];
  };
}

export function useFitzpatrickRules() {
  return useQuery({
    queryKey: ["fitzpatrick-rules"],
    queryFn: () => apiClientFetch<FitzpatrickRule[]>("/fitzpatrick-rules"),
  });
}

export function useFitzpatrickRule(id: string, enabled = true) {
  const rules = useFitzpatrickRules();
  return {
    ...rules,
    data: enabled ? rules.data?.find((rule) => rule.id === id) : undefined,
  };
}

export function useCreateFitzpatrickRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FitzpatrickRuleInput) =>
      apiClientFetch<FitzpatrickRule>("/fitzpatrick-rules", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fitzpatrick-rules"] }),
  });
}

export function useUpdateFitzpatrickRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FitzpatrickRuleInput> }) =>
      apiClientFetch<FitzpatrickRule>(`/fitzpatrick-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fitzpatrick-rules"] }),
  });
}

export function useDeleteFitzpatrickRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch<{ ok: boolean }>(`/fitzpatrick-rules/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fitzpatrick-rules"] }),
  });
}

export function useSimulateFitzpatrickRule() {
  return useMutation({
    mutationFn: (input: { fitzpatrickScale: FitzpatrickScale }) =>
      apiClientFetch<FitzpatrickSimulationResult>("/fitzpatrick-rules/simulate", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}
