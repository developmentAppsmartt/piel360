"use client";

// GET/POST /api/me/survey (MIGRACION.md §2.6). Única ruta exenta del gate de
// encuesta en src/proxy.ts — si no, redirigir aquí crearía un bucle.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { refreshSurveySession } from "@/lib/actions/survey";
import { ApiError } from "@/lib/api-error";
import { type FitzpatrickType, useSubmitSurvey } from "@/lib/queries/survey";
import { FITZPATRICK_DESCRIPTIONS, SURVEY_QUESTIONS } from "@/lib/survey-questions";

export default function EncuestaPage() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const submitSurvey = useSubmitSurvey();

  const current = SURVEY_QUESTIONS[step];
  const isLastStep = step === SURVEY_QUESTIONS.length - 1;

  function selectOption(value: string) {
    setAnswers((prev) => ({ ...prev, [current.key]: value }));
  }

  async function handleNext() {
    if (!answers[current.key]) return;

    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }

    await submitSurvey.mutateAsync({
      skinType: answers.skin_type,
      fitzpatrickType: answers.fitzpatrick_type as FitzpatrickType | undefined,
      surveyResponses: answers,
    });
    await refreshSurveySession();
    router.push("/patient/dashboard");
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Encuesta inicial</h1>
        <p className="text-muted-foreground">
          Antes de continuar, cuéntanos un poco sobre tu piel y tus hábitos. Son
          {` ${SURVEY_QUESTIONS.length} `}
          preguntas rápidas que nos ayudan a personalizar tu experiencia.
        </p>
        <Button type="button" onClick={() => setStarted(true)}>
          Comenzar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Pregunta {step + 1} de {SURVEY_QUESTIONS.length}
        </p>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / SURVEY_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <h1 className="text-xl font-semibold">{current.question}</h1>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {current.options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => selectOption(option.value)}
            className={`rounded-lg border p-3 text-left text-sm transition-colors ${
              answers[current.key] === option.value
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {current.key === "fitzpatrick_type" && answers.fitzpatrick_type && (
        <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          {FITZPATRICK_DESCRIPTIONS[answers.fitzpatrick_type]}
        </p>
      )}

      {submitSurvey.error && (
        <p className="text-sm text-destructive">
          {submitSurvey.error instanceof ApiError
            ? submitSurvey.error.message
            : "No se pudo guardar la encuesta."}
        </p>
      )}

      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Atrás
        </Button>
        <Button
          type="button"
          disabled={!answers[current.key] || submitSurvey.isPending}
          onClick={handleNext}
        >
          {isLastStep ? (submitSurvey.isPending ? "Guardando..." : "Finalizar") : "Siguiente"}
        </Button>
      </div>
    </div>
  );
}
