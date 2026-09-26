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

export type LifestyleSegment = {
  key: string;
  label: string;
  patients: number;
  pct: number;
  avgScore: number | null;
  analyses?: number;
};

export type LifestyleReportSection = {
  title: string;
  segments: LifestyleSegment[];
};

export type LifestyleReport = {
  range: { from: string; to: string };
  birthType: LifestyleReportSection;
  pets: LifestyleReportSection;
  activity: LifestyleReportSection;
  clinicalAi: LifestyleReportSection;
};

function buildQuery(filters: DoctorReportsFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.professionalUserId && filters.professionalUserId !== "all") {
    params.set("professionalUserId", filters.professionalUserId);
  }
  if (filters.trendMonths) {
    params.set("trendMonths", String(filters.trendMonths));
  }
  return params.toString();
}

/**
 * Bundle de las tres pantallas de Reportes. Un solo endpoint porque comparten
 * filtros; ver apps/api/src/doctor-reports/doctor-reports.service.ts.
 */
export function useDoctorSkinHealthReport(filters: DoctorReportsFilters) {
  const query = buildQuery(filters);

  return useQuery({
    queryKey: ["doctor", "reports", "skin-health", filters],
    queryFn: () =>
      apiClientFetch<SkinHealthReport>(
        `/doctor/reports/skin-health${query ? `?${query}` : ""}`,
      ),
  });
}

export function useDoctorLifestyleReport(filters: DoctorReportsFilters) {
  const query = buildQuery(filters);

  return useQuery({
    queryKey: ["doctor", "reports", "lifestyle", filters],
    queryFn: () =>
      apiClientFetch<LifestyleReport>(
        `/doctor/reports/lifestyle${query ? `?${query}` : ""}`,
      ),
  });
}

export function useDoctorSkiniverReport(filters: DoctorReportsFilters) {
  const query = buildQuery(filters);

  return useQuery({
    queryKey: ["doctor", "reports", "skiniver", filters],
    queryFn: () =>
      apiClientFetch<import("@piel360/shared").SkiniverReport>(
        `/doctor/reports/skiniver${query ? `?${query}` : ""}`,
      ),
  });
}
