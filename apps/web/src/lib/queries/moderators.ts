"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type Moderator = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  docType: string | null;
  docNumber: string | null;
  phone: string | null;
  createdAt: string;
  user: { email: string; createdAt: string };
};

export type CreateModeratorInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  docType?: string;
  docNumber?: string;
  phone?: string;
};

export function useModerators() {
  return useQuery({
    queryKey: ["admin", "moderators"],
    queryFn: () => apiClientFetch<Moderator[]>("/admin/moderators"),
  });
}

export function useCreateModerator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateModeratorInput) =>
      apiClientFetch("/admin/moderators", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "moderators"] });
    },
  });
}

export function useDeleteModerator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch(`/admin/moderators/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "moderators"] });
    },
  });
}
