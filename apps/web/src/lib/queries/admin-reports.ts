"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type ReportGranularity = "day" | "month" | "year";

export interface ReportsFilters {
  startDate?: string;
  endDate?: string;
  granularity?: ReportGranularity;
}

export interface AdminReports {
  subscriptionStatus: { active: number; pending: number; expired: number };
  diagnosisByClass: { label: string; count: number }[];
  diagnosisByAge: { label: string; count: number }[];
  timeSeries: { period: string; count: number }[];
}

export function useAdminReports(filters: ReportsFilters) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.granularity) params.set("granularity", filters.granularity);
  const query = params.toString();

  return useQuery({
    queryKey: ["admin", "reports", filters],
    queryFn: () => apiClientFetch<AdminReports>(`/admin/reports${query ? `?${query}` : ""}`),
  });
}
