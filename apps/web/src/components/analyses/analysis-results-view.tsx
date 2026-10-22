"use client";

import { useState } from "react";
import { ConfirmAnalysisForm } from "@/components/analyses/confirm-analysis-form";
import { Button } from "@/components/ui/button";
import { DermaResultsSection } from "@/components/analyses/derma-results-section";
import { FitzpatrickResultsSection } from "@/components/analyses/fitzpatrick-results-section";
import { AnalisisPiel360ProgressView } from "@/components/analyses/youcam-progress-view";
import { AnalisisPiel360ReportView } from "@/components/analyses/youcam-report-view";
import { AnalisisPiel360ResultsSection } from "@/components/analyses/youcam-results-section";
import { ModuleCard } from "@/components/ui/module-card";
import { useAnalysis, useConfirmAnalysis } from "@/lib/queries/analyses";

type AnalisisPiel360SubView = "detail" | "progress" | "report";

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
  const [analisisPiel360View, setAnalisisPiel360View] = useState<AnalisisPiel360SubView>("detail");
  const [editingNotes, setEditingNotes] = useState(false);

  const isAnalisisPiel360 = !!analysis.data?.analisisPiel360TaskId;
  const isFitzpatrick = !!analysis.data?.fitzpatrickTaskId;
  const isAnalisisDermaPiel360 = !isAnalisisPiel360 && !isFitzpatrick;
  // El estético pide observaciones; Fitzpatrick no.
  const usesDoctorNotes = isAnalisisPiel360;
  const analisisPiel360Error =
    isAnalisisPiel360 &&
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

  if (isAnalisisPiel360 && analysis.data.isValid && analisisPiel360View === "progress") {
    return (
      <AnalisisPiel360ProgressView
        analysis={analysis.data}
        onBack={() => setAnalisisPiel360View("detail")}
      />
    );
  }

  if (isAnalisisPiel360 && analysis.data.isValid && analisisPiel360View === "report") {
    return (
      <AnalisisPiel360ReportView
        analysis={analysis.data}
        patientName={patientName}
        onBack={() => setAnalisisPiel360View("detail")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {isAnalisisPiel360 && !analysis.data.isValid && analisisPiel360Error && (
        <p className="text-destructive">
          El análisis no se pudo procesar: {analisisPiel360Error}. Intenta nuevamente con
          una foto de mejor resolución.
        </p>
      )}

      {isAnalisisPiel360 && !analysis.data.isValid && !analisisPiel360Error && (
        <p className="text-muted-foreground">
          Procesando el análisis facial... Esto puede tardar varios minutos —
          puedes cerrar esta pantalla y volver más tarde.
        </p>
      )}

      {isAnalisisPiel360 && analysis.data.isValid && (
        <AnalisisPiel360ResultsSection
          analysis={analysis.data}
          onOpenProgress={() => setAnalisisPiel360View("progress")}
          onOpenReport={() => setAnalisisPiel360View("report")}
        />
      )}

      {isFitzpatrick && (
        <FitzpatrickResultsSection analysis={analysis.data} />
      )}

      {isAnalisisDermaPiel360 && (
        <DermaResultsSection
          key={analysis.data.id}
          analysis={analysis.data}
          canConfirm={!hideConfirm}
          onSubmit={async (input) => {
            await confirmAnalysis.mutateAsync(input);
            onConfirmed?.();
          }}
        />
      )}

      {/* El dermatológico confirma y corrige dentro de DermaResultsSection. */}
      {!hideConfirm &&
        !isAnalisisDermaPiel360 &&
        (!isAnalisisPiel360 || analysis.data.isValid) &&
        (analysis.data.isConfirmed && !editingNotes ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Análisis{" "}
              {analysis.data.isCorrected ? "corregido" : "confirmado"}
              {analysis.data.finalDiagnosis
                ? `: ${analysis.data.finalDiagnosis}`
                : "."}
            </p>
            {/* Las observaciones guardadas no se mostraban en ningún lado:
                solo viajaban al backend al corregir. */}
            {usesDoctorNotes ? (
              <ModuleCard className="space-y-2 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Observaciones
                </p>
                <p className="text-sm whitespace-pre-line">
                  {analysis.data.doctorNotes?.trim()
                    ? analysis.data.doctorNotes
                    : "Sin observaciones del médico todavía."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingNotes(true)}
                >
                  Editar observaciones
                </Button>
              </ModuleCard>
            ) : null}
          </div>
        ) : (
          <ConfirmAnalysisForm
            aiDiagnosis={analysis.data.aiDiagnosis}
            requireNotes={usesDoctorNotes}
            initialNotes={analysis.data.doctorNotes ?? ""}
            onCancel={editingNotes ? () => setEditingNotes(false) : undefined}
            onSubmit={async (input) => {
              await confirmAnalysis.mutateAsync(input);
              setEditingNotes(false);
              onConfirmed?.();
            }}
          />
        ))}

    </div>
  );
}
