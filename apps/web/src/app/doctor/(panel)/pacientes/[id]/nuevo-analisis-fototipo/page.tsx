"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AnalysisResultsView } from "@/components/analyses/analysis-results-view";
import { YoucamCapture } from "@/components/analyses/youcam-capture";
import { Button } from "@/components/ui/button";
import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import { ApiError } from "@/lib/api-error";
import { useCreateFitzpatrickAnalysis } from "@/lib/queries/fitzpatrick";

type Step = "consentimiento" | "captura" | "enviar" | "resultados";

export default function NuevoAnalisisFitzpatrickPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("consentimiento");
  const [consented, setConsented] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const createAnalysis = useCreateFitzpatrickAnalysis();

  async function handleSubmit() {
    if (!photo) return;
    try {
      const created = await createAnalysis.mutateAsync({ patientId, image: photo });
      setAnalysisId(created.analysisId);
      setStep("resultados");
    } catch {
      // El error queda expuesto vía createAnalysis.error, renderizado más abajo.
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1>{ANALYSIS_PROVIDER_STATIC_LABELS.fototipo}</h1>

      {step === "consentimiento" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este análisis captura una selfie del paciente para clasificar su fototipo de piel
            (tipos I a VI) mediante inteligencia artificial. La imagen se
            procesa de forma segura y solo es visible para el equipo médico.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
            />
            El paciente acepta la captura y el análisis de su imagen facial.
          </label>
          <Button type="button" disabled={!consented} onClick={() => setStep("captura")}>
            Continuar
          </Button>
        </div>
      )}

      {step === "captura" && (
        <div className="space-y-6">
          <YoucamCapture onCapture={setPhoto} />
          {photo && <p className="text-sm text-muted-foreground">Foto capturada correctamente.</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("consentimiento")}>
              Atrás
            </Button>
            <Button type="button" disabled={!photo} onClick={() => setStep("enviar")}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === "enviar" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se enviará la foto para clasificar el fototipo de piel. Esto puede tardar unos
            segundos.
          </p>
          {createAnalysis.error && (
            <p className="text-sm text-destructive">
              {createAnalysis.error instanceof ApiError
                ? createAnalysis.error.message
                : "No se pudo crear el análisis."}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={createAnalysis.isPending} onClick={() => setStep("captura")}>
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
