"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FitzpatrickResult,
  SkiniverDiagnosisDetails,
  SkiniverPrediction,
  YouCamResults,
} from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

// Shape que escribe YoucamResultsService#applyError cuando YouCam rechaza el
// task de forma permanente (ej. "Input image resolution is too small.") — el
// job de respaldo/webhook dejan de reintentar en ese caso.
export interface YouCamAnalysisError {
  error: true;
  message: string;
}

// Shape completo de GET/POST /analyses (`id` es string por el polyfill de
// BigInt del backend). imageUrl/coloredUrl/maskedUrl/masks son URLs firmadas
// agregadas por AnalysesService.withImageUrls — no existen como columnas.
// aiRawResponse es SkiniverPrediction si youcamTaskId/fitzpatrickTaskId son
// null, YouCamResults/YouCamAnalysisError si hay youcamTaskId, o
// FitzpatrickResult si hay fitzpatrickTaskId (distinguir por esos campos
// antes de leer, y por la propiedad `error` para el caso de fallo YouCam).
export interface AnalysisDetail {
  id: string;
  patientId: string;
  youcamTaskId: string | null;
  fitzpatrickTaskId: string | null;
  bodyRegion: string | null;
  xCoord: number | null;
  yCoord: number | null;
  zCoord: number | null;
  isValid: boolean;
  validationScore: number | null;
  aiDiagnosis: string | null;
  aiProbability: number | null;
  aiRawResponse:
    | SkiniverPrediction
    | YouCamResults
    | YouCamAnalysisError
    | FitzpatrickResult
    | null;
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
  // Solo Skiniver — diagnóstico/tratamiento/consejo/ICD parseados del texto
  // libre de aiRawResponse.description (ver skiniver-description.util.ts).
  skiniverDiagnosis: SkiniverDiagnosisDetails | null;
  // true solo si se guardó la selfie original aparte (YouCam con
  // enableMaskOverlay: false) — en ese caso imageUrl es una foto real que
  // sirve de fondo para las máscaras crudas; si no, imageUrl es un link
  // muerto (placeholder interno) que no debe mostrarse.
  hasOriginalPhoto: boolean;
  createdAt: string;
  skinAgeYears?: number | null;
  chronologicalAgeYears?: number | null;
  skinAgeDifference?: number | null;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    skinType?: string | null;
    fitzpatrickType?: string | null;
  } | null;
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
  // Puede faltar en filas creadas antes de que providerId se empezara a
  // guardar — ver apps/web/src/lib/analysis-provider-label.ts para el fallback.
  provider?: { displayLabel: string | null } | null;
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

export function useAnalysis(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["analyses", id],
    queryFn: () => apiClientFetch<AnalysisDetail>(`/analyses/${id}`),
    enabled: options?.enabled !== false && !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const attempts = query.state.dataUpdateCount;

      if (data.youcamTaskId) {
        // Si ya se marcó como fallo permanente (YoucamResultsService#applyError),
        // isValid se queda en false para siempre — sin esto el polling seguiría
        // los 200s completos mostrando "procesando" sobre algo que ya falló.
        const failed =
          !!data.aiRawResponse &&
          typeof data.aiRawResponse === "object" &&
          "error" in data.aiRawResponse &&
          data.aiRawResponse.error === true;
        return !data.isValid && !failed && attempts < YOUCAM_MAX_ATTEMPTS ? YOUCAM_POLL_MS : false;
      }

      const pending = !data.coloredUrl || !data.maskedUrl;
      return pending && attempts < SKINIVER_MAX_ATTEMPTS ? SKINIVER_POLL_MS : false;
    },
  });
}

export function useAnalyses(enabled = true) {
  return useQuery({
    queryKey: ["analyses"],
    queryFn: () => apiClientFetch<AnalysisListItem[]>("/analyses"),
    enabled,
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
