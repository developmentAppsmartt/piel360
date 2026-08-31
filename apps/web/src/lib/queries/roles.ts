"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export interface Permission {
  id: string;
  name: string;
  slug: string;
  label?: string | null;
  description?: string | null;
  isActive: boolean;
  kind: string;
  panel?: string | null;
  href?: string | null;
  sortOrder?: number;
  parentSlug?: string | null;
}

export interface RoleSpecialtyLink {
  doctorSpecialtyId: string;
  doctorSpecialty: {
    id: string;
    name: string;
    slug: string;
    roleId: string;
  };
}

export interface Role {
  id: string;
  name: string;
  label: string | null;
  description: string | null;
  color: string | null;
  isActive: boolean;
  laborTechnicianProfileId: string | null;
  laborTechnicianProfile: {
    id: string;
    name: string;
    slug: string;
  } | null;
  specialtyLinks: RoleSpecialtyLink[];
  permissions: Permission[];
  _count: { users: number };
}

export interface RoleInput {
  label: string;
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  permissionIds?: string[];
  specialtyIds?: string[];
  laborTechnicianProfileId?: string | null;
}

export function useRoles() {
  return useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => apiClientFetch<Role[]>("/admin/roles"),
  });
}

export function useRole(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin", "roles", id],
    queryFn: () => apiClientFetch<Role>(`/admin/roles/${id}`),
    enabled: Boolean(id) && (options?.enabled ?? true),
    retry: false,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => apiClientFetch<Permission[]>("/admin/permissions"),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoleInput) =>
      apiClientFetch<Role>("/admin/roles", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
  });
}

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<RoleInput>) =>
      apiClientFetch<Role>(`/admin/roles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "roles", id] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch<void>(`/admin/roles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
  });
}
