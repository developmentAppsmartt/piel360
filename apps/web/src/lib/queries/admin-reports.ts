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
    queryFn: () =>
      apiClientFetch<AdminReports>(`/admin/reports${query ? `?${query}` : ""}`),
  });
}

export type AdminReportScopes = {
  organizations: { id: string; name: string }[];
  professionals: {
    userId: string;
    name: string;
    organizationName: string | null;
  }[];
};

/** Empresas y profesionales para el selector de alcance de Reportes. Los
 * reportes en sí usan los hooks de `doctor-reports.ts` con `source: "admin"`. */
export function useAdminReportScopes() {
  return useQuery({
    queryKey: ["admin", "reports", "scopes"],
    queryFn: () => apiClientFetch<AdminReportScopes>("/admin/reports/scopes"),
    staleTime: 5 * 60_000,
  });
}
