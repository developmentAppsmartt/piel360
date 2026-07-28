"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: { name: string }[];
  createdAt: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiClientFetch<AdminUser[]>("/admin/users"),
  });
}
