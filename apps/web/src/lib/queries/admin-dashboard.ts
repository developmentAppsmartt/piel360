"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export interface AdminDashboardStats {
  subscriptions: { active: number; pending: number; expired: number };
  riskDistribution: { low: number; medium: number; high: number };
}

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => apiClientFetch<AdminDashboardStats>("/admin/dashboard-stats"),
  });
}
