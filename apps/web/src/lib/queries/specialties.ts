"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type Specialty = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  roleId: string;
  doctorCount: number;
};

export type SpecialtyInput = {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export function useSpecialties(enabled = true) {
  return useQuery({
    queryKey: ["specialties"],
    queryFn: () => apiClientFetch<Specialty[]>("/specialties"),
    enabled,
  });
}

export function useAdminSpecialties() {
  return useQuery({
    queryKey: ["admin", "specialties"],
    queryFn: () => apiClientFetch<Specialty[]>("/admin/specialties"),
  });
}

export function useCreateSpecialty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SpecialtyInput) =>
      apiClientFetch<Specialty>("/admin/specialties", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "specialties"] });
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "specialty-plan-permissions"],
      });
    },
  });
}

export function useUpdateSpecialty(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SpecialtyInput>) =>
      apiClientFetch<Specialty>(`/admin/specialties/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "specialties"] });
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "specialty-plan-permissions"],
      });
    },
  });
}

export function useDeleteSpecialty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch<void>(`/admin/specialties/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "specialties"] });
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "specialty-plan-permissions"],
      });
    },
  });
}
