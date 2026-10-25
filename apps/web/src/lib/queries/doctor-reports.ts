"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  SkinHealthReport,
  AnalisisDermaPiel360Report,
} from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export type { SkinHealthReport, AnalisisDermaPiel360Report };

export interface DoctorReportsFilters {
  /** YYYY-MM-DD inclusivo. */
  from?: string;
  /** YYYY-MM-DD inclusivo. */
  to?: string;
  /** Sentinela "all" → no se manda (solo el owner del equipo puede filtrar). */
  professionalUserId?: string;
  /** Solo el admin: lo que ve esa empresa. */
  organizationId?: string;
  trendMonths?: number;
}

/** Los mismos reportes desde el panel del doctor o el del admin (que añade
 * el alcance por empresa o profesional). */
export type ReportsSource = "doctor" | "admin";

const BASE_PATH: Record<ReportsSource, string> = {
  doctor: "/doctor/reports",
  admin: "/admin/reports",
};

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
  if (filters.organizationId)
    params.set("organizationId", filters.organizationId);
  if (filters.trendMonths) {
    params.set("trendMonths", String(filters.trendMonths));
  }
  return params.toString();
}

function reportUrl(
  source: ReportsSource,
  name: string,
  filters: DoctorReportsFilters,
) {
  const query = buildQuery(filters);
  return `${BASE_PATH[source]}/${name}${query ? `?${query}` : ""}`;
}

/**
 * Bundle de las tres pantallas de Reportes. Un solo endpoint porque comparten
 * filtros; ver apps/api/src/doctor-reports/doctor-reports.service.ts.
 */
export function useSkinHealthReport(
  filters: DoctorReportsFilters,
  source: ReportsSource = "doctor",
) {
  return useQuery({
    queryKey: [source, "reports", "skin-health", filters],
    queryFn: () =>
      apiClientFetch<SkinHealthReport>(
        reportUrl(source, "skin-health", filters),
      ),
  });
}

export function useLifestyleReport(
  filters: DoctorReportsFilters,
  source: ReportsSource = "doctor",
) {
  return useQuery({
    queryKey: [source, "reports", "lifestyle", filters],
    queryFn: () =>
      apiClientFetch<LifestyleReport>(reportUrl(source, "lifestyle", filters)),
  });
}

/** Reporte de análisis dermatológicos. `enabled` evita traerlo mientras el
 * usuario está en otra pestaña de la pantalla de reportes. */
export function useAnalisisDermaPiel360Report(
  filters: DoctorReportsFilters,
  enabled = true,
  source: ReportsSource = "doctor",
) {
  return useQuery({
    queryKey: [source, "reports", "analisisdermapiel360", filters],
    queryFn: () =>
      apiClientFetch<AnalisisDermaPiel360Report>(
        reportUrl(source, "analisisdermapiel360", filters),
      ),
    enabled,
  });
}
