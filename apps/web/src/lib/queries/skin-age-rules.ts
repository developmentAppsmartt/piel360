"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type SkinAgeRulePriority = "low" | "medium" | "high" | "very_high";
export type SkinAgeRuleColorKey = "green" | "blue" | "orange" | "amber" | "red";

export interface SkinAgeRule {
  id: string;
  doctorId: string;
  label: string;
  description: string | null;
  minDifference: number;
  maxDifference: number;
  priority: SkinAgeRulePriority;
  colorKey: SkinAgeRuleColorKey;
  sortOrder: number;
  isActive: boolean;
  routineIds: string[];
  treatmentIds: string[];
  productGroupIds: string[];
  supplementGroupIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkinAgeRuleInput {
  label: string;
  description?: string;
  minDifference: number;
  maxDifference: number;
  priority?: SkinAgeRulePriority;
  colorKey?: SkinAgeRuleColorKey;
  sortOrder?: number;
  isActive?: boolean;
  routineIds?: string[];
  treatmentIds?: string[];
  productGroupIds?: string[];
  supplementGroupIds?: string[];
}

export interface SkinAgeRuleGroupPreview {
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

export interface SkinAgeSimulationResult {
  snapshot: {
    skinAgeYears: number | null;
    chronologicalAgeYears: number | null;
    skinAgeDifference: number | null;
    message: string | null;
  };
  matchedRule: SkinAgeRule | null;
  recommendations: {
    routines: SkinAgeRuleGroupPreview[];
    treatments: SkinAgeRuleGroupPreview[];
    products: SkinAgeRuleGroupPreview[];
    supplements: SkinAgeRuleGroupPreview[];
  };
}

export function useSkinAgeRules() {
  return useQuery({
    queryKey: ["skin-age-rules"],
    queryFn: () => apiClientFetch<SkinAgeRule[]>("/skin-age-rules"),
  });
}

export function useCreateSkinAgeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SkinAgeRuleInput) =>
      apiClientFetch<SkinAgeRule>("/skin-age-rules", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skin-age-rules"] }),
  });
}

export function useUpdateSkinAgeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SkinAgeRuleInput> }) =>
      apiClientFetch<SkinAgeRule>(`/skin-age-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skin-age-rules"] }),
  });
}

export function useDeleteSkinAgeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch<{ ok: boolean }>(`/skin-age-rules/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skin-age-rules"] }),
  });
}

export function useSimulateSkinAgeRule() {
  return useMutation({
    mutationFn: (input: { birthDate: string; skinAgeYears: number }) =>
      apiClientFetch<SkinAgeSimulationResult>("/skin-age-rules/simulate", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}

export type AnalysisCareItem = SkinAgeRuleGroupPreview & {
  categoryName?: string | null;
  productType?: string;
  productUrl?: string | null;
  imageUrl?: string | null;
  steps?: {
    id: string;
    order: number;
    title: string;
    description: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
  }[];
};

export type AnalysisCareRecommendations = SkinAgeSimulationResult & {
  catalog: {
    routines: AnalysisCareItem[];
    treatments: AnalysisCareItem[];
    products: AnalysisCareItem[];
    supplements: AnalysisCareItem[];
  };
};

/** Recomendaciones + catálogo del médico del paciente (doctor y paciente). */
export function useAnalysisCareRecommendations(
  analysisId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["analyses", analysisId, "care-recommendations"],
    queryFn: () =>
      apiClientFetch<AnalysisCareRecommendations>(
        `/analyses/${analysisId}/care-recommendations`,
      ),
    enabled: enabled && Boolean(analysisId),
  });
}
