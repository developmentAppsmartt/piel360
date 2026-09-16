"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type Parameter = {
  id: string;
  typeId: string;
  code: string | null;
  label: string;
  metadata: unknown;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ParameterType = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
};

export type ParameterInput = {
  label: string;
  code?: string;
  sortOrder?: number;
  isActive?: boolean;
};

/** Público — usado por los combobox de los formularios de registro. */
export function useParameters(typeSlug: string, enabled = true) {
  return useQuery({
    queryKey: ["parameters", typeSlug],
    queryFn: () => apiClientFetch<Parameter[]>(`/parameters/${typeSlug}`),
    enabled: enabled && !!typeSlug,
    staleTime: 5 * 60_000,
  });
}

export function useAdminParameterTypes() {
  return useQuery({
    queryKey: ["admin", "parameter-types"],
    queryFn: () => apiClientFetch<ParameterType[]>("/admin/parameter-types"),
  });
}

export function useCreateParameterType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { slug: string; name: string }) =>
      apiClientFetch<ParameterType>("/admin/parameter-types", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "parameter-types"] });
    },
  });
}

export function useAdminParameters(typeSlug: string) {
  return useQuery({
    queryKey: ["admin", "parameters", typeSlug],
    queryFn: () => apiClientFetch<Parameter[]>(`/admin/parameters/${typeSlug}`),
    enabled: !!typeSlug,
  });
}

export function useCreateParameter(typeSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ParameterInput) =>
      apiClientFetch<Parameter>(`/admin/parameters/${typeSlug}`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "parameters", typeSlug] });
      queryClient.invalidateQueries({ queryKey: ["parameters", typeSlug] });
    },
  });
}

export function useUpdateParameter(typeSlug: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ParameterInput>) =>
      apiClientFetch<Parameter>(`/admin/parameters/${typeSlug}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "parameters", typeSlug] });
      queryClient.invalidateQueries({ queryKey: ["parameters", typeSlug] });
    },
  });
}

export function useDeleteParameter(typeSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch<void>(`/admin/parameters/${typeSlug}/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "parameters", typeSlug] });
      queryClient.invalidateQueries({ queryKey: ["parameters", typeSlug] });
    },
  });
}
