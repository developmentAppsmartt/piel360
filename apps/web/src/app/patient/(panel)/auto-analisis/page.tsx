"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnalysisResultsView } from "@/components/analyses/analysis-results-view";
import { BodySelector } from "@/components/analyses/body-selector";
import { PhotoCapture } from "@/components/analyses/photo-capture";
import { YoucamCapture } from "@/components/analyses/youcam-capture";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { useCreateAnalysis } from "@/lib/queries/analyses";
import { useMyPatient } from "@/lib/queries/patients";
import { useCreateYoucamAnalysis } from "@/lib/queries/youcam";

type Provider = "skiniver" | "youcam";
type Step = "elegir" | "consentimiento" | "captura" | "region" | "enviar" | "resultados";

interface BodySelection {
  bodyRegion: string;
  xCoord: number;
  yCoord: number;
  zCoord: number;
}

export default function AutoAnalisisPage() {
  const router = useRouter();
  const patient = useMyPatient();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [step, setStep] = useState<Step>("elegir");
  const [photo, setPhoto] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [bodySelection, setBodySelection] = useState<BodySelection | null>(null);
  const [enableMaskOverlay, setEnableMaskOverlay] = useState(true);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const createSkiniverAnalysis = useCreateAnalysis();
  const createYoucamAnalysis = useCreateYoucamAnalysis();

  const createAnalysis = provider === "youcam" ? createYoucamAnalysis : createSkiniverAnalysis;

  function chooseProvider(next: Provider) {
    setProvider(next);
    setStep(next === "youcam" ? "consentimiento" : "captura");
  }

  async function handleSubmit() {
    if (!photo || !patient.data) return;
    try {
      if (provider === "youcam") {
        const created = await createYoucamAnalysis.mutateAsync({
          patientId: patient.data.id,
          image: photo.blob,
          enableMaskOverlay,
          ...bodySelection,
        });
        setAnalysisId(created.analysisId);
      } else {
        const created = await createSkiniverAnalysis.mutateAsync({
          patientId: patient.data.id,
          image: photo.blob,
          ...bodySelection,
        });
        setAnalysisId(created.id);
      }
      setStep("resultados");
    } catch {
      // El error queda expuesto vía createAnalysis.error, renderizado más abajo.
    }
  }

  if (patient.isLoading) return <p className="text-muted-foreground">Cargando...</p>;
  if (!patient.data) return <p className="text-destructive">No se pudo cargar tu perfil.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1>Auto-análisis</h1>

      {step === "elegir" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => chooseProvider("skiniver")}
            className="rounded-lg border border-border p-4 text-left hover:bg-muted"
          >
            <p className="font-medium">Análisis de piel (Skiniver)</p>
            <p className="text-sm text-muted-foreground">
              Sube o toma una foto de una lesión o zona de la piel que quieras revisar.
            </p>
          </button>
          <button
            type="button"
            onClick={() => chooseProvider("youcam")}
            className="rounded-lg border border-border p-4 text-left hover:bg-muted"
          >
            <p className="font-medium">Análisis facial (YouCam)</p>
            <p className="text-sm text-muted-foreground">
              Captura una selfie para evaluar 16 métricas de piel del rostro.
            </p>
          </button>
        </div>
      )}

      {step === "consentimiento" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este análisis captura una selfie tuya para evaluar 16 métricas de piel (arrugas,
            poros, manchas, etc.) mediante inteligencia artificial. Tu doctor podrá ver el
            resultado y confirmarlo o corregirlo.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("elegir")}>
              Atrás
            </Button>
            <Button type="button" onClick={() => setStep("captura")}>
              Aceptar y continuar
            </Button>
          </div>
        </div>
      )}

      {step === "captura" && provider === "skiniver" && (
        <div className="space-y-4">
          <PhotoCapture onCapture={(file, previewUrl) => setPhoto({ blob: file, previewUrl })} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("elegir")}>
              Atrás
            </Button>
            <Button type="button" disabled={!photo} onClick={() => setStep("region")}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === "captura" && provider === "youcam" && (
        <div className="space-y-6">
          <YoucamCapture onCapture={(blob) => setPhoto({ blob, previewUrl: URL.createObjectURL(blob) })} />
          {photo && <p className="text-sm text-muted-foreground">Foto capturada correctamente.</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("consentimiento")}>
              Atrás
            </Button>
            <Button type="button" disabled={!photo} onClick={() => setStep("region")}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === "region" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Indica la zona del cuerpo (opcional) — puedes omitir este paso.
          </p>
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
            {provider === "youcam"
              ? "Se enviará la foto a YouCam para el análisis facial. El resultado puede tardar varios minutos en procesarse."
              : "Se enviará la foto a Skiniver para el análisis. Esto puede tardar unos segundos."}
          </p>
          {provider === "youcam" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enableMaskOverlay}
                onChange={(e) => setEnableMaskOverlay(e.target.checked)}
              />
              Superponer las máscaras sobre la foto original
            </label>
          )}
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

      {step === "resultados" && analysisId && patient.data && (
        <div className="space-y-6">
          <AnalysisResultsView
            analysisId={analysisId}
            patientId={patient.data.id}
            hideConfirm
            patientName={`${patient.data.firstName} ${patient.data.lastName}`.trim()}
          />
          <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm">
              Tu análisis quedó registrado. Tu doctor lo revisará y confirmará el
              diagnóstico.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/patient/analisis/${analysisId}`)}
            >
              Abrir detalle completo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
