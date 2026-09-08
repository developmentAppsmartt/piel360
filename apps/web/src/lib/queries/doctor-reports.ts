"use client";

import { useQuery } from "@tanstack/react-query";
import type { SkinHealthReport } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export type { SkinHealthReport };

export interface DoctorReportsFilters {
  /** YYYY-MM-DD inclusivo. */
  from?: string;
  /** YYYY-MM-DD inclusivo. */
  to?: string;
  /** Sentinela "all" → no se manda (solo el owner del equipo puede filtrar). */
  professionalUserId?: string;
  trendMonths?: number;
}

/**
 * Bundle de las tres pantallas de Reportes. Un solo endpoint porque comparten
 * filtros; ver apps/api/src/doctor-reports/doctor-reports.service.ts.
 */
export function useDoctorSkinHealthReport(filters: DoctorReportsFilters) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.professionalUserId && filters.professionalUserId !== "all") {
    params.set("professionalUserId", filters.professionalUserId);
  }
  if (filters.trendMonths) params.set("trendMonths", String(filters.trendMonths));
  const query = params.toString();

  return useQuery({
    queryKey: ["doctor", "reports", "skin-health", filters],
    queryFn: () =>
      apiClientFetch<SkinHealthReport>(
        `/doctor/reports/skin-health${query ? `?${query}` : ""}`,
      ),
  });
}
