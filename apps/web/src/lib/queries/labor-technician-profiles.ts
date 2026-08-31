"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type LaborTechnicianProfile = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  roleId: string | null;
};

export type LaborTechnicianProfileInput = {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export function useLaborTechnicianProfiles(enabled = true) {
  return useQuery({
    queryKey: ["labor-technician-profiles"],
    queryFn: () =>
      apiClientFetch<LaborTechnicianProfile[]>("/labor-technician-profiles"),
    enabled,
  });
}

export function useAdminLaborTechnicianProfiles() {
  return useQuery({
    queryKey: ["admin", "labor-technician-profiles"],
    queryFn: () =>
      apiClientFetch<LaborTechnicianProfile[]>(
        "/admin/labor-technician-profiles",
      ),
  });
}

export function useCreateLaborTechnicianProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LaborTechnicianProfileInput) =>
      apiClientFetch<LaborTechnicianProfile>(
        "/admin/labor-technician-profiles",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "labor-technician-profiles"],
      });
      queryClient.invalidateQueries({
        queryKey: ["labor-technician-profiles"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "specialty-plan-permissions"],
      });
    },
  });
}

export function useUpdateLaborTechnicianProfile(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<LaborTechnicianProfileInput>) =>
      apiClientFetch<LaborTechnicianProfile>(
        `/admin/labor-technician-profiles/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "labor-technician-profiles"],
      });
      queryClient.invalidateQueries({
        queryKey: ["labor-technician-profiles"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "specialty-plan-permissions"],
      });
    },
  });
}

export function useDeleteLaborTechnicianProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch<void>(`/admin/labor-technician-profiles/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "labor-technician-profiles"],
      });
      queryClient.invalidateQueries({
        queryKey: ["labor-technician-profiles"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "specialty-plan-permissions"],
      });
    },
  });
}
