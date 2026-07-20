"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { SkiniverDiagnosisCandidate, SkiniverPrediction } from "@piel360/shared";
import { BodySelector } from "@/components/analyses/body-selector";
import { ConfirmAnalysisForm } from "@/components/analyses/confirm-analysis-form";
import { DiagnosisDetailDialog } from "@/components/analyses/diagnosis-detail-dialog";
import { DiagnosisList } from "@/components/analyses/diagnosis-list";
import { ImageCarousel } from "@/components/analyses/image-carousel";
import { PhotoCapture } from "@/components/analyses/photo-capture";
import { RiskGauge } from "@/components/analyses/risk-gauge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { useAnalysis, useConfirmAnalysis, useCreateAnalysis } from "@/lib/queries/analyses";

type Step = "captura" | "region" | "enviar" | "resultados";

interface BodySelection {
  bodyRegion: string;
  xCoord: number;
  yCoord: number;
  zCoord: number;
}

export default function NuevoAnalisisPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("captura");
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(null);
  const [bodySelection, setBodySelection] = useState<BodySelection | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<SkiniverDiagnosisCandidate | null>(null);

  const createAnalysis = useCreateAnalysis();
  const analysis = useAnalysis(analysisId ?? "");
  const confirmAnalysis = useConfirmAnalysis(analysisId ?? "", patientId);

  // Esta página solo crea análisis Skiniver (useCreateAnalysis) —
  // aiRawResponse siempre es un SkiniverPrediction acá, nunca YouCamResults.
  const prediction = analysis.data?.aiRawResponse as SkiniverPrediction | undefined;

  async function handleSubmit() {
    if (!photo) return;
    try {
      const created = await createAnalysis.mutateAsync({
        patientId,
        image: photo.file,
        ...bodySelection,
      });
      setAnalysisId(created.id);
      setStep("resultados");
    } catch {
      // El error queda expuesto vía createAnalysis.error, renderizado más abajo.
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo análisis (Skiniver)</h1>

      {step === "captura" && (
        <div className="space-y-4">
          <PhotoCapture onCapture={(file, previewUrl) => setPhoto({ file, previewUrl })} />
          <Button type="button" disabled={!photo} onClick={() => setStep("region")}>
            Continuar
          </Button>
        </div>
      )}

      {step === "region" && (
        <div className="space-y-4">
          <BodySelector onSelect={setBodySelection} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("captura")}>
              Atrás
            </Button>
            <Button type="button" onClick={() => setStep("enviar")}>
              {bodySelection ? "Continuar" : "Omitir"}
            </Button>
          </div>
        </div>
      )}

      {step === "enviar" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se enviará la foto a Skiniver para el análisis. Esto puede tardar unos segundos.
          </p>
          {createAnalysis.error && (
            <p className="text-sm text-destructive">
              {createAnalysis.error instanceof ApiError
                ? createAnalysis.error.message
                : "No se pudo crear el análisis."}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("region")}>
              Atrás
            </Button>
            <Button type="button" disabled={createAnalysis.isPending} onClick={handleSubmit}>
              {createAnalysis.isPending ? "Analizando..." : "Analizar"}
            </Button>
          </div>
        </div>
      )}

      {step === "resultados" && analysisId && (
        <div className="space-y-6">
          {analysis.isLoading && <p className="text-muted-foreground">Cargando resultados...</p>}

          {analysis.data && (
            <>
              <RiskGauge
                percent={(prediction?.high_risk_prob ?? analysis.data.aiProbability ?? 0) * 100}
                riskLabel={prediction?.risk ?? "—"}
              />

              {prediction?.topn && (
                <DiagnosisList items={prediction.topn} onSelect={setSelectedDiagnosis} />
              )}

              <ImageCarousel
                images={[
                  { label: "Original", url: analysis.data.imageUrl },
                  { label: "Coloreada", url: analysis.data.coloredUrl },
                  { label: "Máscara", url: analysis.data.maskedUrl },
                ]}
              />

              {analysis.data.isConfirmed ? (
                <p className="text-sm text-muted-foreground">
                  Diagnóstico {analysis.data.isCorrected ? "corregido" : "confirmado"}: {analysis.data.finalDiagnosis}
                </p>
              ) : (
                <ConfirmAnalysisForm
                  aiDiagnosis={analysis.data.aiDiagnosis}
                  onSubmit={async (input) => {
                    await confirmAnalysis.mutateAsync(input);
                    router.push(`/doctor/pacientes/${patientId}`);
                  }}
                />
              )}
            </>
          )}

          <DiagnosisDetailDialog item={selectedDiagnosis} onClose={() => setSelectedDiagnosis(null)} />
        </div>
      )}
    </div>
  );
}
