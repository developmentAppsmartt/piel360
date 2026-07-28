"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AnalysisResultsView } from "@/components/analyses/analysis-results-view";
import { BodySelector } from "@/components/analyses/body-selector";
import { PhotoCapture } from "@/components/analyses/photo-capture";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { useCreateAnalysis } from "@/lib/queries/analyses";

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

  const createAnalysis = useCreateAnalysis();

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
        <AnalysisResultsView
          analysisId={analysisId}
          patientId={patientId}
          onConfirmed={() => router.push(`/doctor/pacientes/${patientId}`)}
        />
      )}
    </div>
  );
}
