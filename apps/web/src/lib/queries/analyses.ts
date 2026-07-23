"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SkiniverPrediction, YouCamResults } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

// Shape completo de GET/POST /analyses (`id` es string por el polyfill de
// BigInt del backend). imageUrl/coloredUrl/maskedUrl/masks son URLs firmadas
// agregadas por AnalysesService.withImageUrls — no existen como columnas.
// aiRawResponse es SkiniverPrediction si youcamTaskId es null, YouCamResults
// si no (distinguir por youcamTaskId antes de leer sus campos).
export interface AnalysisDetail {
  id: string;
  patientId: string;
  youcamTaskId: string | null;
  bodyRegion: string | null;
  xCoord: number | null;
  yCoord: number | null;
  zCoord: number | null;
  isValid: boolean;
  validationScore: number | null;
  aiDiagnosis: string | null;
  aiProbability: number | null;
  aiRawResponse: SkiniverPrediction | YouCamResults | null;
  finalDiagnosis: string | null;
  isConfirmed: boolean;
  isCorrected: boolean;
  doctorNotes: string | null;
  imagePath: string;
  coloredS3Url: string | null;
  maskedS3Url: string | null;
  imageUrl: string | null;
  coloredUrl: string | null;
  maskedUrl: string | null;
  masks: { type: string; region?: string; url: string }[];
  createdAt: string;
}

export interface CreateAnalysisInput {
  patientId: string;
  image: Blob;
  bodyRegion?: string;
  xCoord?: number;
  yCoord?: number;
  zCoord?: number;
}

export interface ConfirmAnalysisInput {
  isCorrected: boolean;
  finalDiagnosis?: string;
  doctorNotes?: string;
}

// Shape de GET /analyses (listado) — más liviano que AnalysisDetail: sin
// imageUrl/coloredUrl/masks firmadas (el backend no llama a withImageUrls acá),
// pero sí incluye `patient` (analyses.service.ts#findAll) para el listado global.
export interface AnalysisListItem {
  id: string;
  patientId: string;
  youcamTaskId: string | null;
  bodyRegion: string | null;
  isValid: boolean;
  aiDiagnosis: string | null;
  finalDiagnosis: string | null;
  isConfirmed: boolean;
  isCorrected: boolean;
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface EncyclopediaEntry {
  id: string;
  url: string;
  title: string | null;
  content: string | null;
}

// YouCam es async de verdad (webhook o job de respaldo con hasta 20
// intentos / backoff exponencial de 30s) — puede tardar varios minutos.
// Skiniver ya responde con el diagnóstico listo; solo faltan colored/masked
// (copiado async, unos segundos).
const YOUCAM_POLL_MS = 5000;
const YOUCAM_MAX_ATTEMPTS = 40; // ~40 * 5s = 200s de polling activo en cliente
const SKINIVER_POLL_MS = 3000;
const SKINIVER_MAX_ATTEMPTS = 10;

export function useAnalysis(id: string) {
  return useQuery({
    queryKey: ["analyses", id],
    queryFn: () => apiClientFetch<AnalysisDetail>(`/analyses/${id}`),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const attempts = query.state.dataUpdateCount;

      if (data.youcamTaskId) {
        return !data.isValid && attempts < YOUCAM_MAX_ATTEMPTS ? YOUCAM_POLL_MS : false;
      }

      const pending = !data.coloredUrl || !data.maskedUrl;
      return pending && attempts < SKINIVER_MAX_ATTEMPTS ? SKINIVER_POLL_MS : false;
    },
  });
}

export function useAnalyses() {
  return useQuery({
    queryKey: ["analyses"],
    queryFn: () => apiClientFetch<AnalysisListItem[]>("/analyses"),
  });
}

export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ image, ...fields }: CreateAnalysisInput) => {
      const form = new FormData();
      form.append("image", image, "photo.jpg");
      form.append("patientId", fields.patientId);
      if (fields.bodyRegion) form.append("bodyRegion", fields.bodyRegion);
      if (fields.xCoord !== undefined) form.append("xCoord", String(fields.xCoord));
      if (fields.yCoord !== undefined) form.append("yCoord", String(fields.yCoord));
      if (fields.zCoord !== undefined) form.append("zCoord", String(fields.zCoord));

      return apiClientFetch<AnalysisDetail>("/analyses", { method: "POST", body: form });
    },
    onSuccess: (analysis) => {
      queryClient.invalidateQueries({ queryKey: ["patients", analysis.patientId, "analyses"] });
    },
  });
}

export function useConfirmAnalysis(id: string, patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConfirmAnalysisInput) =>
      apiClientFetch<AnalysisDetail>(`/analyses/${id}/confirm`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses", id] });
      queryClient.invalidateQueries({ queryKey: ["patients", patientId, "analyses"] });
    },
  });
}

export function useEncyclopediaByUrl(url: string | undefined) {
  return useQuery({
    queryKey: ["encyclopedia", "by-url", url],
    queryFn: () =>
      apiClientFetch<EncyclopediaEntry | null>(`/encyclopedia/by-url?url=${encodeURIComponent(url!)}`),
    enabled: !!url,
  });
}
