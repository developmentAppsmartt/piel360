"use client";

import { useState } from "react";
import {
  analisisDermaPiel360CategoryLabel,
  analisisDermaPiel360DiagnosisLabel,
  analisisDermaPiel360RiskLabel,
  type AnalisisDermaPiel360DiagnosisCandidate,
  type AnalisisDermaPiel360Prediction,
} from "@piel360/shared";
import {
  DermaCorrectionForm,
  type NosologyChoice,
} from "@/components/analyses/derma-correction-form";
import { DermaDiagnosisActions } from "@/components/analyses/derma-diagnosis-actions";
import { DiagnosisDetailDialog } from "@/components/analyses/diagnosis-detail-dialog";
import {
  candidateKey,
  DiagnosisList,
  RiskLegend,
} from "@/components/analyses/diagnosis-list";
import { ImageCarousel } from "@/components/analyses/image-carousel";
import { NosologyPickerDialog } from "@/components/analyses/nosology-picker-dialog";
import { ProfessionalOutcomeCard } from "@/components/analyses/professional-outcome-card";
import { gaugePercent, percent } from "@/components/analyses/derma-risk";
import { RiskGauge } from "@/components/analyses/risk-gauge";
import {
  AnalisisDermaPiel360Descriptive,
  AnalisisDermaPiel360RiskGuidanceBlock,
} from "@/components/analyses/skiniver-descriptive";
import { ModuleCard } from "@/components/ui/module-card";
import type { AnalysisDetail, ConfirmAnalysisInput } from "@/lib/queries/analyses";

type Candidate = AnalisisDermaPiel360DiagnosisCandidate;

function candidateLabel(item: Candidate) {
  return analisisDermaPiel360DiagnosisLabel(item.class, item.class_raw);
}

/** Lo que muestra la tarjeta del profesional: lo guardado si ya confirmó, o
 * la elección en curso mientras decide. El ICD solo existe para el
 * diagnóstico principal de la IA o para el candidato que lo trae. */
function professionalOutcome(
  analysis: AnalysisDetail,
  selected: Candidate | null,
  prediction: AnalisisDermaPiel360Prediction | undefined,
) {
  const topn = prediction?.topn ?? [];
  if (analysis.isConfirmed && analysis.finalDiagnosis?.trim()) {
    const code = analysis.finalDiagnosisCode;
    const icd = code
      ? topn.find((item) => item.class_raw === code)?.lesion_code
      : prediction?.lesion_code;
    return {
      kind: analysis.isCorrected ? ("corrected" as const) : ("selected" as const),
      title: analysis.finalDiagnosis.trim(),
      notes: analysis.doctorNotes,
      icd: icd?.trim() || null,
    };
  }
  if (!selected) return null;
  const isTop = selected === topn[0];
  return {
    kind: "selected" as const,
    title: candidateLabel(selected),
    notes: null,
    icd: (selected.lesion_code ?? (isTop ? prediction?.lesion_code : null))?.trim() || null,
  };
}

/**
 * Resultado de un análisis dermatológico. El profesional elige uno de los
 * diagnósticos de apoyo y lo confirma, o, si ninguno le sirve, lo corrige con
 * «Seleccionar de la lista». Mismo recorrido que la app móvil.
 */
export function DermaResultsSection({
  analysis,
  canConfirm,
  onSubmit,
}: {
  analysis: AnalysisDetail;
  /** Profesional con permiso; el paciente solo consulta. */
  canConfirm: boolean;
  onSubmit: (input: ConfirmAnalysisInput) => Promise<unknown>;
}) {
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [correction, setCorrection] = useState<NosologyChoice | null>(null);

  const prediction = analysis.aiRawResponse as AnalisisDermaPiel360Prediction | undefined;
  const topn = prediction?.topn ?? [];
  const topDiagnosis = topn[0];
  const selecting = canConfirm && !analysis.isConfirmed;
  // La IA no traduce `risk`/`class`/`desease`: se resuelven contra
  // `risk_level` y `class_raw`, que no dependen del idioma.
  const riskLabel = selected
    ? analisisDermaPiel360RiskLabel(selected.risk, selected.risk_level)
    : analisisDermaPiel360RiskLabel(prediction?.risk, topDiagnosis?.risk_level);
  const outcome = canConfirm ? professionalOutcome(analysis, selected, prediction) : null;

  function handleCandidate(item: Candidate) {
    if (!selecting || (selected && candidateKey(selected) === candidateKey(item))) {
      setDetail(item);
      return;
    }
    setSelected(item);
  }

  async function submit(input: ConfirmAnalysisInput) {
    await onSubmit(input);
    setCorrection(null);
  }

  return (
    <>
      <RiskGauge percent={gaugePercent(prediction)} riskLabel={riskLabel} />

      {outcome ? <ProfessionalOutcomeCard {...outcome} /> : null}

      {topDiagnosis ? (
        <ModuleCard className="flex items-center gap-4 p-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-primary text-lg font-bold text-primary">
            {Math.round(percent(topDiagnosis.prob))}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {analisisDermaPiel360CategoryLabel(topDiagnosis.desease) ||
                "Diagnóstico principal"}
            </p>
            <p className="truncate text-base font-semibold">
              {candidateLabel(topDiagnosis)}
            </p>
            {topDiagnosis.risk ? (
              <p className="text-sm text-muted-foreground">
                Riesgo:{" "}
                {analisisDermaPiel360RiskLabel(topDiagnosis.risk, topDiagnosis.risk_level)}
              </p>
            ) : null}
          </div>
        </ModuleCard>
      ) : null}

      <ImageCarousel
        images={[
          { label: "Original", url: analysis.imageUrl },
          { label: "Coloreada", url: analysis.coloredUrl },
          { label: "Máscara", url: analysis.maskedUrl },
        ]}
      />

      <ModuleCard className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          Nivel de Riesgo: {riskLabel}
          {selected ? ` · ${candidateLabel(selected)}` : ""}
        </p>
        <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/80">
          Este resultado es orientativo. Consulta con un dermatólogo y evita la
          automedicación.
        </p>
      </ModuleCard>

      {analysis.analisisDermaPiel360Diagnosis ? (
        <ModuleCard className="space-y-3 p-4">
          <AnalisisDermaPiel360Descriptive
            details={analysis.analisisDermaPiel360Diagnosis}
            icdCode={analysis.analisisDermaPiel360Diagnosis.icd_code}
          />
          {analysis.analisisDermaPiel360Diagnosis.conclusion.category && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Conclusión</p>
              <p className="text-sm">
                {analysis.analisisDermaPiel360Diagnosis.conclusion.category}
                {" · "}
                {analysis.analisisDermaPiel360Diagnosis.conclusion.category_prob}%
              </p>
            </div>
          )}
          <AnalisisDermaPiel360RiskGuidanceBlock
            risk={analysis.analisisDermaPiel360Diagnosis.risk}
          />
        </ModuleCard>
      ) : null}

      {topn.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <h3 className="text-base font-semibold">
              {!canConfirm
                ? "Lee más sobre la enfermedad"
                : analysis.isConfirmed
                  ? "Diagnósticos de apoyo de la IA"
                  : "Elija una opción de los diagnósticos de apoyo"}
            </h3>
            <RiskLegend />
          </div>
          <DiagnosisList
            items={topn}
            onSelect={handleCandidate}
            selectedKey={selecting && selected ? candidateKey(selected) : null}
          />
          {selecting && !selected ? (
            <p className="text-xs text-muted-foreground">
              Haz clic en un diagnóstico para seleccionarlo como resultado del
              registro; un segundo clic abre su detalle.
            </p>
          ) : null}
        </div>
      ) : null}

      {canConfirm && correction ? (
        <DermaCorrectionForm
          choice={correction}
          initialNotes={analysis.doctorNotes ?? ""}
          onChangeChoice={() => setPickerOpen(true)}
          onCancel={() => setCorrection(null)}
          onSubmit={submit}
        />
      ) : null}
      {canConfirm && !correction ? (
        <DermaDiagnosisActions
          analysis={analysis}
          choice={
            selected
              ? { label: candidateLabel(selected), code: selected.class_raw ?? null }
              : null
          }
          onCorrect={() => setPickerOpen(true)}
          onSubmit={submit}
        />
      ) : null}

      <NosologyPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(item, category) => {
          setCorrection({ item, category });
          setPickerOpen(false);
        }}
      />

      <DiagnosisDetailDialog
        item={detail}
        details={
          detail
            ? (analysis.analisisDermaPiel360Diagnosis?.candidates.find(
                (candidate) =>
                  candidate.class.toLowerCase() === detail.class.trim().toLowerCase(),
              ) ?? null)
            : null
        }
        onClose={() => setDetail(null)}
      />
    </>
  );
}
