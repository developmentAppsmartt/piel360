"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AESTHETIC_ANALYSIS_CONSENT } from "@piel360/shared";
import { AnalysisConsentStep } from "@/components/analyses/analysis-consent-step";
import { AnalysisResultsView } from "@/components/analyses/analysis-results-view";
import { BodySelector } from "@/components/analyses/body-selector";
import { AnalisisPiel360Capture } from "@/components/analyses/youcam-capture";
import { Button } from "@/components/ui/button";
import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import { ApiError } from "@/lib/api-error";
import { genderFromPatient } from "@/lib/body-model";
import { usePatient } from "@/lib/queries/patients";
import { useCreateAnalisisPiel360Analysis } from "@/lib/queries/youcam";
import { useWizardStep } from "@/lib/use-wizard-step";

type Step = "consentimiento" | "captura" | "enviar" | "resultados";

interface BodySelection {
  bodyRegion: string;
  xCoord: number;
  yCoord: number;
  zCoord: number;
}

export default function NuevoAnalisisAnalisisPiel360Page() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: patient } = usePatient(patientId);

  const [step, goTo] = useWizardStep<Step>("consentimiento");
  const [consented, setConsented] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [bodySelection, setBodySelection] = useState<BodySelection | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const createAnalysis = useCreateAnalisisPiel360Analysis();

  async function handleSubmit() {
    if (!photo) return;
    try {
      const created = await createAnalysis.mutateAsync({
        patientId,
        image: photo,
        ...bodySelection,
        consentAccepted: consented,
      });
      setAnalysisId(created.analysisId);
      goTo("resultados");
    } catch {
      // El error queda expuesto vía createAnalysis.error, renderizado más abajo.
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1>{ANALYSIS_PROVIDER_STATIC_LABELS.analisispiel360}</h1>

      {step === "consentimiento" && (
        <AnalysisConsentStep
          text={AESTHETIC_ANALYSIS_CONSENT}
          accepted={consented}
          onAcceptedChange={setConsented}
          onContinue={() => goTo("captura")}
        />
      )}

      {step === "captura" && (
        <div className="space-y-6">
          <AnalisisPiel360Capture onCapture={setPhoto} />
          {photo && <p className="text-sm text-muted-foreground">Foto capturada correctamente.</p>}

          <div className="space-y-2">
            <h2 className="text-lg font-medium">Región (opcional)</h2>
            <BodySelector
              onSelect={setBodySelection}
              patientGender={genderFromPatient(patient?.gender)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => goTo("consentimiento")}>
              Atrás
            </Button>
            <Button type="button" disabled={!photo} onClick={() => goTo("enviar")}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === "enviar" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se enviará la foto para el análisis facial. El resultado puede tardar
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
            <Button type="button" variant="outline" onClick={() => goTo("captura")}>
              Atrás
            </Button>
            <Button type="button" disabled={createAnalysis.isPending} onClick={handleSubmit}>
              {createAnalysis.isPending ? "Enviando..." : "Analizar"}
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
