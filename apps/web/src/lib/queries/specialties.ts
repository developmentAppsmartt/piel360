"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type Specialty = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SpecialtyInput = {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

/** Catálogo activo (público) para registro / selects. */
export function useActiveSpecialties() {
  return useQuery({
    queryKey: ["specialties", "active"],
    queryFn: () => apiClientFetch<Specialty[]>("/specialties"),
    staleTime: 60_000,
  });
}

export function useAdminSpecialties() {
  return useQuery({
    queryKey: ["admin", "specialties"],
    queryFn: () => apiClientFetch<Specialty[]>("/admin/specialties"),
  });
}

export function useCreateSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SpecialtyInput) =>
      apiClientFetch<Specialty>("/admin/specialties", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "specialties"] });
      void qc.invalidateQueries({ queryKey: ["specialties"] });
    },
  });
}

export function useUpdateSpecialty(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SpecialtyInput>) =>
      apiClientFetch<Specialty>(`/admin/specialties/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "specialties"] });
      void qc.invalidateQueries({ queryKey: ["specialties"] });
    },
  });
}

export function useDeleteSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch(`/admin/specialties/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "specialties"] });
      void qc.invalidateQueries({ queryKey: ["specialties"] });
    },
  });
}
