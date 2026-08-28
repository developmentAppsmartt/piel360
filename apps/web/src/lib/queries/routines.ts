"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** "lt" | "lte" | "eq" | "gte" | "gt" — igual al backend (routine-condition.dto.ts). */
export type RoutineConditionOperator = "lt" | "lte" | "eq" | "gte" | "gt";

export interface RoutineCondition {
  id?: string;
  metricType: string;
  region?: string | null;
  operator: RoutineConditionOperator;
  value: number;
}

export interface RoutineStep {
  id: string;
  routineId: string;
  order: number;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | "gif" | null;
  productId: string | null;
}

export interface Routine {
  id: string;
  doctorId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  conditions: RoutineCondition[];
  steps: RoutineStep[];
}

export interface CreateRoutineInput {
  name: string;
  description?: string;
  isActive?: boolean;
  conditions?: RoutineCondition[];
}

export interface CreateRoutineStepInput {
  order: number;
  title: string;
  description?: string;
  productId?: number;
}

// ─── Rutinas ────────────────────────────────────────────────────────────────────

export function useRoutines(enabled = true) {
  return useQuery({
    queryKey: ["routines"],
    queryFn: () => apiClientFetch<Routine[]>("/routines"),
    enabled,
  });
}

export function useRoutine(id: string) {
  return useQuery({
    queryKey: ["routines", id],
    queryFn: () => apiClientFetch<Routine>(`/routines/${id}`),
    enabled: !!id,
  });
}

/** Rutinas recomendadas para un análisis YouCam ya completado. */
export function useRecommendedRoutines(analysisId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["routines", "recommended", analysisId],
    queryFn: () => apiClientFetch<Routine[]>(`/routines/recommended/${analysisId}`),
    enabled: enabled && !!analysisId,
  });
}

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoutineInput) =>
      apiClientFetch<Routine>("/routines", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

export function useUpdateRoutine(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateRoutineInput>) =>
      apiClientFetch<Routine>(`/routines/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
      qc.invalidateQueries({ queryKey: ["routines", id] });
    },
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClientFetch(`/routines/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

// ─── Pasos ──────────────────────────────────────────────────────────────────────

export function useCreateRoutineStep(routineId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoutineStepInput) =>
      apiClientFetch<RoutineStep>(`/routines/${routineId}/steps`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", routineId] });
    },
  });
}

export function useUpdateRoutineStep(routineId: string, stepId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateRoutineStepInput>) =>
      apiClientFetch<RoutineStep>(`/routines/${routineId}/steps/${stepId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", routineId] });
    },
  });
}

export function useDeleteRoutineStep(routineId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stepId: string) =>
      apiClientFetch(`/routines/${routineId}/steps/${stepId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", routineId] });
    },
  });
}

export function useUploadRoutineStepMedia(routineId: string, stepId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiClientFetch<RoutineStep>(`/routines/${routineId}/steps/${stepId}/media`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", routineId] });
    },
  });
}
