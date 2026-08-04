"use client";

import { useState } from "react";
import type { SkiniverDiagnosisCandidate, SkiniverPrediction, YouCamResults } from "@piel360/shared";
import { ConfirmAnalysisForm } from "@/components/analyses/confirm-analysis-form";
import { DiagnosisDetailDialog } from "@/components/analyses/diagnosis-detail-dialog";
import { DiagnosisList } from "@/components/analyses/diagnosis-list";
import { ImageCarousel } from "@/components/analyses/image-carousel";
import { MaskLayersOverlay } from "@/components/analyses/mask-layers-overlay";
import { RiskGauge } from "@/components/analyses/risk-gauge";
import { useAnalysis, useConfirmAnalysis } from "@/lib/queries/analyses";
import { youcamMaskLabel } from "@/lib/youcam-metric-labels";

// Subconjunto pedido por el cliente para la vista combinada (todas estas
// capas a la vez sobre la foto original) — a diferencia de las demás
// métricas, que se siguen viendo una a la vez en el carrusel. `hd_pore` y
// `hd_wrinkle` usan la región "whole" (todas las zonas combinadas) en vez de
// una subcategoría puntual, para que la capa cubra la cara completa.
const COMBINED_LAYER_KEYS: { type: string; region?: string }[] = [
  { type: "hd_dark_circle" },
  { type: "hd_firmness" },
  { type: "hd_oiliness" },
  { type: "hd_redness" },
  { type: "hd_eye_bag" },
  { type: "hd_tear_trough" },
  { type: "hd_pore", region: "whole" },
  { type: "hd_wrinkle", region: "whole" },
];

function metricSubtitle(row: { ui_score?: number; raw_score?: number; skin_type?: string }): string | undefined {
  if (row.skin_type) return row.skin_type;
  if (row.ui_score === undefined) return undefined;
  const raw = row.raw_score !== undefined ? ` (Puntaje: ${row.raw_score.toFixed(1)})` : "";
  return `${Math.round(row.ui_score)}/100${raw}`;
}

/** Vista de resultados de un análisis (Skiniver o YouCam) — extraída de los
 * wizards de creación para reusarla también al revisar un análisis ya
 * existente (`pacientes/[id]/analisis/[analysisId]`). `onConfirmed` es
 * opcional: los wizards redirigen tras confirmar, la vista de detalle se
 * queda en la misma página (el estado se actualiza solo vía react-query). */
export function AnalysisResultsView({
  analysisId,
  patientId,
  onConfirmed,
}: {
  analysisId: string;
  patientId: string;
  onConfirmed?: () => void;
}) {
  const analysis = useAnalysis(analysisId);
  const confirmAnalysis = useConfirmAnalysis(analysisId, patientId);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<SkiniverDiagnosisCandidate | null>(null);

  const isYoucam = !!analysis.data?.youcamTaskId;
  const prediction = !isYoucam ? (analysis.data?.aiRawResponse as SkiniverPrediction | undefined) : undefined;
  const youcamError =
    isYoucam &&
    analysis.data?.aiRawResponse &&
    typeof analysis.data.aiRawResponse === "object" &&
    "error" in analysis.data.aiRawResponse &&
    analysis.data.aiRawResponse.error === true
      ? analysis.data.aiRawResponse.message
      : null;

  // El JSON crudo de YouCam trae, además de las 16 métricas con máscara, dos
  // entradas sin imagen (`all`/`skin_age`) y una de metadata interna
  // (`resize_image`, el redimensionado automático — no es un resultado
  // clínico). `analysis.data.masks` (backend) descarta ui_score/raw_score/
  // skin_type a propósito para firmar solo la URL — hay que volver a cruzar
  // con el output crudo para recuperarlos.
  const youcamOutput =
    isYoucam && !youcamError && analysis.data?.aiRawResponse
      ? (analysis.data.aiRawResponse as YouCamResults).output
      : [];
  const overallScore = youcamOutput.find((item) => item.type === "all")?.score;
  const skinAge = youcamOutput.find((item) => item.type === "skin_age")?.score;
  const metricRows = (analysis.data?.masks ?? []).map((mask) => {
    const output = youcamOutput.find(
      (item) => item.type === mask.type && item.region === mask.region,
    );
    return { ...mask, ui_score: output?.ui_score, raw_score: output?.raw_score, skin_type: output?.skin_type };
  });
  // Solo tiene sentido combinar capas cuando son .png crudos con transparencia
  // (enableMaskOverlay: false) — con overlay:true cada máscara ya es un .jpg
  // opaco con la foto horneada adentro, y apilarlas solo taparía las de abajo.
  const combinedLayersBackgroundUrl =
    analysis.data?.hasOriginalPhoto && analysis.data.imageUrl ? analysis.data.imageUrl : null;
  const combinedLayers = combinedLayersBackgroundUrl
    ? COMBINED_LAYER_KEYS.flatMap((key) => {
        const mask = metricRows.find((row) => row.type === key.type && row.region === key.region);
        return mask ? [{ label: youcamMaskLabel(mask.type, mask.region), url: mask.url }] : [];
      })
    : [];

  if (analysis.isLoading) return <p className="text-muted-foreground">Cargando resultados...</p>;
  if (!analysis.data) return null;

  return (
    <div className="space-y-6">
      {isYoucam && !analysis.data.isValid && youcamError && (
        <p className="text-destructive">
          El análisis no se pudo procesar: {youcamError}. Intenta nuevamente con una foto de mejor
          resolución.
        </p>
      )}

      {isYoucam && !analysis.data.isValid && !youcamError && (
        <p className="text-muted-foreground">
          Procesando el análisis facial... Esto puede tardar varios minutos — puedes cerrar esta
          pantalla y volver más tarde.
        </p>
      )}

      {isYoucam && analysis.data.isValid && (
        <>
          {(overallScore !== undefined || skinAge !== undefined) && (
            <div className="flex gap-6">
              {overallScore !== undefined && (
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{Math.round(overallScore)}/100</p>
                  <p className="text-sm text-muted-foreground">Puntaje general de piel</p>
                </div>
              )}
              {skinAge !== undefined && (
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{Math.round(skinAge)} años</p>
                  <p className="text-sm text-muted-foreground">Edad de piel estimada</p>
                </div>
              )}
            </div>
          )}

          {analysis.data.masks.length > 0 ? (
            <ImageCarousel
              images={metricRows.map((row) => ({
                label: youcamMaskLabel(row.type, row.region),
                url: row.url,
                subtitle: metricSubtitle(row),
              }))}
              backgroundUrl={analysis.data.hasOriginalPhoto ? analysis.data.imageUrl : null}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              El análisis se completó, pero no se generaron máscaras visuales.
            </p>
          )}

          {combinedLayersBackgroundUrl && combinedLayers.length > 0 && (
            <MaskLayersOverlay backgroundUrl={combinedLayersBackgroundUrl} layers={combinedLayers} />
          )}
        </>
      )}

      {!isYoucam && (
        <>
          <RiskGauge
            percent={(prediction?.high_risk_prob ?? analysis.data.aiProbability ?? 0) * 100}
            riskLabel={prediction?.risk ?? "—"}
          />
          {prediction?.topn && <DiagnosisList items={prediction.topn} onSelect={setSelectedDiagnosis} />}
          <ImageCarousel
            images={[
              { label: "Original", url: analysis.data.imageUrl },
              { label: "Coloreada", url: analysis.data.coloredUrl },
              { label: "Máscara", url: analysis.data.maskedUrl },
            ]}
          />
        </>
      )}

      {(!isYoucam || analysis.data.isValid) &&
        (analysis.data.isConfirmed ? (
          <p className="text-sm text-muted-foreground">
            {isYoucam ? "Análisis" : "Diagnóstico"} {analysis.data.isCorrected ? "corregido" : "confirmado"}
            {analysis.data.finalDiagnosis ? `: ${analysis.data.finalDiagnosis}` : "."}
          </p>
        ) : (
          <ConfirmAnalysisForm
            aiDiagnosis={analysis.data.aiDiagnosis}
            onSubmit={async (input) => {
              await confirmAnalysis.mutateAsync(input);
              onConfirmed?.();
            }}
          />
        ))}

      {!isYoucam && (
        <DiagnosisDetailDialog item={selectedDiagnosis} onClose={() => setSelectedDiagnosis(null)} />
      )}
    </div>
  );
}
