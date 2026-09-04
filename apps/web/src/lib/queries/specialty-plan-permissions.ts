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
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ["admin", "specialty-plan-permissions"],
      });
      const previous = queryClient.getQueryData<SpecialtyPlanPermissionRow[]>([
        "admin",
        "specialty-plan-permissions",
      ]);
      if (previous) {
        queryClient.setQueryData<SpecialtyPlanPermissionRow[]>(
          ["admin", "specialty-plan-permissions"],
          previous.map((row) =>
            row.roleId === input.roleId
              ? {
                  ...row,
                  providers: { ...row.providers, ...input.providers },
                }
              : row,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["admin", "specialty-plan-permissions"],
          context.previous,
        );
      }
    },
    onSuccess: (row) => {
      queryClient.setQueryData<SpecialtyPlanPermissionRow[]>(
        ["admin", "specialty-plan-permissions"],
        (current) =>
          current?.map((item) => (item.roleId === row.roleId ? row : item)) ?? [
            row,
          ],
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
  });
}
