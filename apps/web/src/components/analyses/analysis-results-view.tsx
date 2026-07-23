"use client";

import { useState } from "react";
import type { SkiniverDiagnosisCandidate, SkiniverPrediction } from "@piel360/shared";
import { ConfirmAnalysisForm } from "@/components/analyses/confirm-analysis-form";
import { DiagnosisDetailDialog } from "@/components/analyses/diagnosis-detail-dialog";
import { DiagnosisList } from "@/components/analyses/diagnosis-list";
import { ImageCarousel } from "@/components/analyses/image-carousel";
import { RiskGauge } from "@/components/analyses/risk-gauge";
import { useAnalysis, useConfirmAnalysis } from "@/lib/queries/analyses";
import { youcamMaskLabel } from "@/lib/youcam-metric-labels";

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

  if (analysis.isLoading) return <p className="text-muted-foreground">Cargando resultados...</p>;
  if (!analysis.data) return null;

  return (
    <div className="space-y-6">
      {isYoucam && !analysis.data.isValid && (
        <p className="text-muted-foreground">
          Procesando el análisis facial... Esto puede tardar varios minutos — puedes cerrar esta
          pantalla y volver más tarde.
        </p>
      )}

      {isYoucam && analysis.data.isValid && (
        <>
          {analysis.data.masks.length > 0 ? (
            <ImageCarousel
              images={analysis.data.masks.map((mask) => ({
                label: youcamMaskLabel(mask.type, mask.region),
                url: mask.url,
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              El análisis se completó, pero no se generaron máscaras visuales.
            </p>
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
