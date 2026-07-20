"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { BodySelector } from "@/components/analyses/body-selector";
import { ConfirmAnalysisForm } from "@/components/analyses/confirm-analysis-form";
import { ImageCarousel } from "@/components/analyses/image-carousel";
import { YoucamCapture } from "@/components/analyses/youcam-capture";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { useAnalysis, useConfirmAnalysis } from "@/lib/queries/analyses";
import { useCreateYoucamAnalysis } from "@/lib/queries/youcam";
import { youcamMaskLabel } from "@/lib/youcam-metric-labels";

type Step = "consentimiento" | "captura" | "enviar" | "resultados";

interface BodySelection {
  bodyRegion: string;
  xCoord: number;
  yCoord: number;
  zCoord: number;
}

export default function NuevoAnalisisYoucamPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("consentimiento");
  const [consented, setConsented] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [bodySelection, setBodySelection] = useState<BodySelection | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const createAnalysis = useCreateYoucamAnalysis();
  const analysis = useAnalysis(analysisId ?? "");
  const confirmAnalysis = useConfirmAnalysis(analysisId ?? "", patientId);

  async function handleSubmit() {
    if (!photo) return;
    try {
      const created = await createAnalysis.mutateAsync({
        patientId,
        image: photo,
        ...bodySelection,
      });
      setAnalysisId(created.analysisId);
      setStep("resultados");
    } catch {
      // El error queda expuesto vía createAnalysis.error, renderizado más abajo.
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo análisis facial (YouCam)</h1>

      {step === "consentimiento" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este análisis captura una selfie del paciente para evaluar 16 métricas de piel
            (arrugas, poros, manchas, etc.) mediante inteligencia artificial. La imagen se
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

          <div className="space-y-2">
            <h2 className="text-lg font-medium">Región (opcional)</h2>
            <BodySelector onSelect={setBodySelection} />
          </div>

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
            Se enviará la foto a YouCam para el análisis facial. El resultado puede tardar
            varios minutos en procesarse.
          </p>
          {createAnalysis.error && (
            <p className="text-sm text-destructive">
              {createAnalysis.error instanceof ApiError
                ? createAnalysis.error.message
                : "No se pudo crear el análisis."}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("captura")}>
              Atrás
            </Button>
            <Button type="button" disabled={createAnalysis.isPending} onClick={handleSubmit}>
              {createAnalysis.isPending ? "Enviando..." : "Analizar"}
            </Button>
          </div>
        </div>
      )}

      {step === "resultados" && analysisId && (
        <div className="space-y-6">
          {!analysis.data?.isValid && (
            <p className="text-muted-foreground">
              Procesando el análisis facial... Esto puede tardar varios minutos — puedes cerrar
              esta pantalla y volver más tarde desde la ficha del paciente.
            </p>
          )}

          {analysis.data?.isValid && (
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

              {analysis.data.isConfirmed ? (
                <p className="text-sm text-muted-foreground">
                  Análisis {analysis.data.isCorrected ? "corregido" : "confirmado"}
                  {analysis.data.finalDiagnosis ? `: ${analysis.data.finalDiagnosis}` : "."}
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
        </div>
      )}
    </div>
  );
}
