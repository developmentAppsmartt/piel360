"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";
import type { ConditionOperator } from "@/lib/condition-labels";
import type { Product } from "@/lib/queries/products";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TreatmentCondition {
  id?: string;
  metricType: string;
  region?: string | null;
  operator: ConditionOperator;
  /** Numérica — null cuando la condición es categórica (ver textValue). */
  value: number | null;
  /** Categórica — solo `hd_skin_type`. */
  textValue?: string | null;
}

export interface TreatmentItem {
  id: string;
  treatmentId: string;
  order: number;
  note: string | null;
  productId: string;
  product: Product;
}

export interface TreatmentCategory {
  id: string;
  doctorId: string;
  categoryName: string;
  createdAt: string;
  lastModified: string;
  _count?: { treatments: number };
}

export interface Treatment {
  id: string;
  doctorId: string;
  categoryId: string | null;
  category: { id: string; categoryName: string } | null;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  conditions: TreatmentCondition[];
  items: TreatmentItem[];
}

export interface CreateTreatmentInput {
  name: string;
  description?: string;
  categoryId?: number | string | null;
  isActive?: boolean;
  conditions?: TreatmentCondition[];
}

export interface CreateTreatmentItemInput {
  productId: number | string;
  order: number;
  note?: string;
}

export interface CreateTreatmentCategoryInput {
  categoryName: string;
}

// ─── Categorías ─────────────────────────────────────────────────────────────────

export function useTreatmentCategories() {
  return useQuery({
    queryKey: ["treatment-categories"],
    queryFn: () => apiClientFetch<TreatmentCategory[]>("/treatments/categories"),
  });
}

export function useCreateTreatmentCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTreatmentCategoryInput) =>
      apiClientFetch<TreatmentCategory>("/treatments/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatment-categories"] });
    },
  });
}

export function useUpdateTreatmentCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateTreatmentCategoryInput>) =>
      apiClientFetch<TreatmentCategory>(`/treatments/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatment-categories"] });
    },
  });
}

export function useDeleteTreatmentCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch(`/treatments/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatment-categories"] });
      qc.invalidateQueries({ queryKey: ["treatments"] });
    },
  });
}

// ─── Tratamientos / productos sugeridos ─────────────────────────────────────────

export function useTreatments(params?: { categoryId?: string; kind?: "plain" | "treatment" }) {
  return useQuery({
    queryKey: ["treatments", params?.categoryId, params?.kind],
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.categoryId) search.set("categoryId", params.categoryId);
      if (params?.kind) search.set("kind", params.kind);
      const query = search.toString();
      return apiClientFetch<Treatment[]>(query ? `/treatments?${query}` : "/treatments");
    },
  });
}

export function useTreatment(id: string) {
  return useQuery({
    queryKey: ["treatments", id],
    queryFn: () => apiClientFetch<Treatment>(`/treatments/${id}`),
    enabled: !!id,
  });
}

/** Tratamientos/productos sugeridos recomendados para un análisis YouCam
 * ya completado. */
export function useRecommendedTreatments(analysisId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["treatments", "recommended", analysisId],
    queryFn: () => apiClientFetch<Treatment[]>(`/treatments/recommended/${analysisId}`),
    enabled: enabled && !!analysisId,
  });
}

export function useCreateTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTreatmentInput) =>
      apiClientFetch<Treatment>("/treatments", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments"] });
    },
  });
}

export function useUpdateTreatment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateTreatmentInput>) =>
      apiClientFetch<Treatment>(`/treatments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments"] });
      qc.invalidateQueries({ queryKey: ["treatments", id] });
    },
  });
}

export function useDeleteTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClientFetch(`/treatments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments"] });
    },
  });
}

// ─── Ítems (productos) ──────────────────────────────────────────────────────────

export function useCreateTreatmentItem(treatmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTreatmentItemInput) =>
      apiClientFetch<TreatmentItem>(`/treatments/${treatmentId}/items`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments", treatmentId] });
      qc.invalidateQueries({ queryKey: ["treatments"] });
    },
  });
}

export function useUpdateTreatmentItem(treatmentId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateTreatmentItemInput>) =>
      apiClientFetch<TreatmentItem>(`/treatments/${treatmentId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments", treatmentId] });
      qc.invalidateQueries({ queryKey: ["treatments"] });
    },
  });
}

export function useDeleteTreatmentItem(treatmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiClientFetch(`/treatments/${treatmentId}/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments", treatmentId] });
      qc.invalidateQueries({ queryKey: ["treatments"] });
    },
  });
}

export function useReorderTreatmentItems(treatmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedItemIds: string[]) =>
      apiClientFetch<Treatment>(`/treatments/${treatmentId}/items/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ orderedItemIds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments", treatmentId] });
      qc.invalidateQueries({ queryKey: ["treatments"] });
    },
  });
}
