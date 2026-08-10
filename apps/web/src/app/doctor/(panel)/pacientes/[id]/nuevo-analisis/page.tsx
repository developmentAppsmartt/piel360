"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnalysisResultsView } from "@/components/analyses/analysis-results-view";
import { BodySelector } from "@/components/analyses/body-selector";
import { PhotoCapture } from "@/components/analyses/photo-capture";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useCreateAnalysis } from "@/lib/queries/analyses";

type Step = "region" | "captura" | "enviar" | "resultados";

interface BodySelection {
  bodyRegion: string;
  xCoord: number;
  yCoord: number;
  zCoord: number;
}

// Mismos cortes/mensajes que docs/create-analysis.blade.php (sistema viejo).
const PROGRESS_STAGES: [threshold: number, label: string][] = [
  [93, "Diagnósticos completos"],
  [69, "Determinando patología"],
  [48, "Calculando Nivel Riesgo"],
  [26, "Analizando"],
  [7, "Pre procesamiento"],
];

function progressLabel(progress: number) {
  return PROGRESS_STAGES.find(([threshold]) => progress >= threshold)?.[1] ?? "Pre procesamiento";
}

export default function NuevoAnalisisPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("region");
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(null);
  const [bodySelection, setBodySelection] = useState<BodySelection | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createAnalysis = useCreateAnalysis();

  // Progreso simulado — igual que startAnalysis/stopAnalysis en
  // docs/create-analysis.blade.php: incrementos aleatorios con tope en 95%
  // hasta que la respuesta real llegue, salto a 100% al terminar.
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  async function handleSubmit() {
    if (!photo) return;
    setProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setProgress((current) => (current < 95 ? current + Math.floor(Math.random() * 5) + 1 : current));
    }, 200);
    try {
      const created = await createAnalysis.mutateAsync({
        patientId,
        image: photo.file,
        ...bodySelection,
      });
      setProgress(100);
      setAnalysisId(created.id);
      setStep("resultados");
    } catch {
      // El error queda expuesto vía createAnalysis.error, renderizado más abajo.
    } finally {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo análisis - Dermatológico</h1>

      {step === "region" && (
        <div className="space-y-4">
          <BodySelector onSelect={setBodySelection} />
          <div className="flex gap-2">
            <Button type="button" onClick={() => setStep("captura")}>
              {bodySelection ? "Continuar" : "Omitir"}
            </Button>
          </div>
        </div>
      )}

      {step === "captura" && (
        <div className="space-y-4">
          <PhotoCapture onCapture={(file, previewUrl) => setPhoto({ file, previewUrl })} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("region")}>
              Atrás — Cambiar zona
            </Button>
            <Button type="button" disabled={!photo} onClick={() => setStep("enviar")}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === "enviar" && photo && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se enviará la foto a Skiniver para el análisis. Esto puede tardar unos segundos.
          </p>
          <div className="relative overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview de un blob local, no apta para next/image */}
            <img
              src={photo.previewUrl}
              alt="Foto a analizar"
              className={cn("max-h-96 w-full object-contain", createAnalysis.isPending && "animate-pulse opacity-50")}
            />
            {createAnalysis.isPending && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 px-6 text-center">
                <p className="text-3xl font-bold text-primary">{progress} %</p>
                <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-primary">{progressLabel(progress)}</p>
              </div>
            )}
          </div>
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
