"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnalysisProviderSlug } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export type SpecialtyPlanPermissionRow = {
  roleId: string;
  roleSlug: string;
  label: string;
  kind: "specialty" | "labor_technician";
  providers: Record<AnalysisProviderSlug, boolean>;
};

export function useSpecialtyPlanPermissions() {
  return useQuery({
    queryKey: ["admin", "specialty-plan-permissions"],
    queryFn: () =>
      apiClientFetch<SpecialtyPlanPermissionRow[]>(
        "/admin/specialty-plan-permissions",
      ),
  });
}

export function useUpdateSpecialtyPlanPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      roleId: string;
      providers: Partial<Record<AnalysisProviderSlug, boolean>>;
    }) =>
      apiClientFetch<SpecialtyPlanPermissionRow>(
        "/admin/specialty-plan-permissions",
        {
          method: "PATCH",
          body: JSON.stringify({
            roleId: input.roleId,
            ...input.providers,
          }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "specialty-plan-permissions"],
      });
    },
  });
}
