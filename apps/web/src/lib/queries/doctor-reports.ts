"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  SkinHealthReport,
  SkinReportSegmentsResponse,
  SkiniverReport,
} from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export type { SkinHealthReport, SkinReportSegmentsResponse, SkiniverReport };

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

/**
 * Reportes segmentados (tipo de nacimiento, mascota, actividad física).
 * Mismos filtros de fecha/profesional que el resumen; `trendMonths` no se
 * envía porque este endpoint lo ignora (sin comparación de periodo anterior).
 */
export function useDoctorSkinSegmentsReport(filters: DoctorReportsFilters) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.professionalUserId && filters.professionalUserId !== "all") {
    params.set("professionalUserId", filters.professionalUserId);
  }
  const query = params.toString();

  return useQuery({
    queryKey: [
      "doctor",
      "reports",
      "segments",
      filters.from,
      filters.to,
      filters.professionalUserId,
    ],
    queryFn: () =>
      apiClientFetch<SkinReportSegmentsResponse>(
        `/doctor/reports/segments${query ? `?${query}` : ""}`,
      ),
  });
}

/**
 * Reporte "Análisis clínico IA" (Skiniver): diagnósticos por clase/enfermedad
 * /edad por mes + distribución por tono de piel. `trendMonths` no aplica —
 * este reporte cubre el rango de fechas filtrado completo, no una ventana
 * de tendencia aparte.
 */
export function useDoctorSkiniverReport(filters: DoctorReportsFilters) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.professionalUserId && filters.professionalUserId !== "all") {
    params.set("professionalUserId", filters.professionalUserId);
  }
  const query = params.toString();

  return useQuery({
    queryKey: [
      "doctor",
      "reports",
      "skiniver",
      filters.from,
      filters.to,
      filters.professionalUserId,
    ],
    queryFn: () =>
      apiClientFetch<SkiniverReport>(
        `/doctor/reports/skiniver${query ? `?${query}` : ""}`,
      ),
  });
}
