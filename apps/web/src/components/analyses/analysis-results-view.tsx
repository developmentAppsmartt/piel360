"use client";

import { useState } from "react";
import type { SkiniverDiagnosisCandidate, SkiniverPrediction } from "@piel360/shared";
import { ConfirmAnalysisForm } from "@/components/analyses/confirm-analysis-form";
import { DiagnosisDetailDialog } from "@/components/analyses/diagnosis-detail-dialog";
import { DiagnosisList } from "@/components/analyses/diagnosis-list";
import { FitzpatrickResultsSection } from "@/components/analyses/fitzpatrick-results-section";
import { ImageCarousel } from "@/components/analyses/image-carousel";
import { RiskGauge } from "@/components/analyses/risk-gauge";
import { YoucamProgressView } from "@/components/analyses/youcam-progress-view";
import { YoucamReportView } from "@/components/analyses/youcam-report-view";
import { YoucamResultsSection } from "@/components/analyses/youcam-results-section";
import { ModuleCard } from "@/components/ui/module-card";
import { useAnalysis, useConfirmAnalysis } from "@/lib/queries/analyses";

type YoucamSubView = "detail" | "progress" | "report";

/** Vista de resultados de un análisis (Skiniver o YouCam) — alineada a mobile.
 * `hideConfirm` oculta el formulario de confirmación (flujo paciente). */
export function AnalysisResultsView({
  analysisId,
  patientId,
  onConfirmed,
  hideConfirm = false,
  patientName,
}: {
  analysisId: string;
  patientId: string;
  onConfirmed?: () => void;
  hideConfirm?: boolean;
  patientName?: string;
}) {
  const analysis = useAnalysis(analysisId);
  const confirmAnalysis = useConfirmAnalysis(analysisId, patientId);
  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<SkiniverDiagnosisCandidate | null>(null);
  const [youcamView, setYoucamView] = useState<YoucamSubView>("detail");

  const isYoucam = !!analysis.data?.youcamTaskId;
  const isFitzpatrick = !!analysis.data?.fitzpatrickTaskId;
  const isSkiniver = !isYoucam && !isFitzpatrick;
  const prediction = isSkiniver
    ? (analysis.data?.aiRawResponse as SkiniverPrediction | undefined)
    : undefined;
  const youcamError =
    isYoucam &&
    analysis.data?.aiRawResponse &&
    typeof analysis.data.aiRawResponse === "object" &&
    "error" in analysis.data.aiRawResponse &&
    analysis.data.aiRawResponse.error === true
      ? analysis.data.aiRawResponse.message
      : null;

  if (analysis.isLoading) {
    return <p className="text-muted-foreground">Cargando resultados...</p>;
  }
  if (!analysis.data) return null;

  if (isYoucam && analysis.data.isValid && youcamView === "progress") {
    return (
      <YoucamProgressView
        analysis={analysis.data}
        onBack={() => setYoucamView("detail")}
      />
    );
  }

  if (isYoucam && analysis.data.isValid && youcamView === "report") {
    return (
      <YoucamReportView
        analysis={analysis.data}
        patientName={patientName}
        onBack={() => setYoucamView("detail")}
      />
    );
  }

  const topDiagnosis = prediction?.topn?.[0];
  const riskLabel = prediction?.risk ?? "—";

  return (
    <div className="space-y-6">
      {isYoucam && !analysis.data.isValid && youcamError && (
        <p className="text-destructive">
          El análisis no se pudo procesar: {youcamError}. Intenta nuevamente con
          una foto de mejor resolución.
        </p>
      )}

      {isYoucam && !analysis.data.isValid && !youcamError && (
        <p className="text-muted-foreground">
          Procesando el análisis facial... Esto puede tardar varios minutos —
          puedes cerrar esta pantalla y volver más tarde.
        </p>
      )}

      {isYoucam && analysis.data.isValid && (
        <YoucamResultsSection
          analysis={analysis.data}
          onOpenProgress={() => setYoucamView("progress")}
          onOpenReport={() => setYoucamView("report")}
        />
      )}

      {isFitzpatrick && (
        <FitzpatrickResultsSection analysis={analysis.data} />
      )}

      {isSkiniver && (
        <>
          <RiskGauge
            percent={
              (prediction?.high_risk_prob ?? analysis.data.aiProbability ?? 0) *
              100
            }
            riskLabel={riskLabel}
          />

          {topDiagnosis ? (
            <ModuleCard className="flex items-center gap-4 p-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-primary text-lg font-bold text-primary">
                {Math.round(
                  (topDiagnosis.prob <= 1
                    ? topDiagnosis.prob * 100
                    : topDiagnosis.prob),
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {topDiagnosis.desease ?? "Diagnóstico principal"}
                </p>
                <p className="truncate text-base font-semibold">
                  {topDiagnosis.class}
                </p>
                {topDiagnosis.risk ? (
                  <p className="text-sm text-muted-foreground">
                    Riesgo: {topDiagnosis.risk}
                  </p>
                ) : null}
              </div>
            </ModuleCard>
          ) : null}

          <ImageCarousel
            images={[
              { label: "Original", url: analysis.data.imageUrl },
              { label: "Coloreada", url: analysis.data.coloredUrl },
              { label: "Máscara", url: analysis.data.maskedUrl },
            ]}
          />

          <ModuleCard className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Nivel de Riesgo: {riskLabel}
            </p>
            <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/80">
              Este resultado es orientativo. Consulta con un dermatólogo y evita
              la automedicación.
            </p>
          </ModuleCard>

          {analysis.data.skiniverDiagnosis ? (
            <ModuleCard className="space-y-3 p-4">
              {analysis.data.skiniverDiagnosis.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Descripción
                  </p>
                  <p className="text-sm">{analysis.data.skiniverDiagnosis.description}</p>
                </div>
              )}
              {analysis.data.skiniverDiagnosis.conclusion.category && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Conclusión
                  </p>
                  <p className="text-sm">
                    {analysis.data.skiniverDiagnosis.conclusion.category}
                    {" · "}
                    {analysis.data.skiniverDiagnosis.conclusion.category_prob}%
                  </p>
                </div>
              )}
              {analysis.data.skiniverDiagnosis.precise_diagnosis && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Diagnóstico preciso
                  </p>
                  <p className="text-sm">
                    {analysis.data.skiniverDiagnosis.precise_diagnosis}
                  </p>
                </div>
              )}
              {analysis.data.skiniverDiagnosis.treatment && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Tratamiento
                  </p>
                  <p className="text-sm">{analysis.data.skiniverDiagnosis.treatment}</p>
                </div>
              )}
              {analysis.data.skiniverDiagnosis.advice && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Consejo</p>
                  <p className="text-sm">{analysis.data.skiniverDiagnosis.advice}</p>
                </div>
              )}
              {analysis.data.skiniverDiagnosis.icd_code && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Código ICD
                  </p>
                  <p className="text-sm">{analysis.data.skiniverDiagnosis.icd_code}</p>
                </div>
              )}
            </ModuleCard>
          ) : null}

          {prediction?.topn && prediction.topn.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                Lee más sobre la enfermedad
              </h3>
              <DiagnosisList
                items={prediction.topn}
                onSelect={setSelectedDiagnosis}
              />
            </div>
          ) : null}
        </>
      )}

      {!hideConfirm &&
        (!isYoucam || analysis.data.isValid) &&
        (analysis.data.isConfirmed ? (
          <p className="text-sm text-muted-foreground">
            {isYoucam || isFitzpatrick ? "Análisis" : "Diagnóstico"}{" "}
            {analysis.data.isCorrected ? "corregido" : "confirmado"}
            {analysis.data.finalDiagnosis
              ? `: ${analysis.data.finalDiagnosis}`
              : "."}
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

      {isSkiniver && (
        <DiagnosisDetailDialog
          item={selectedDiagnosis}
          onClose={() => setSelectedDiagnosis(null)}
        />
      )}
    </div>
  );
}
