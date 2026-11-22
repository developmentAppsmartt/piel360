import type { AnalisisDermaPiel360Prediction } from "./skiniver.js";
import { analisisDermaPiel360DiagnosisLabel } from "./skiniver-labels.js";

/** Lo que el profesional dejó en un análisis dermatológico, o lo que propone
 * la IA si todavía no confirmó. Lo usan el resultado del análisis, la
 * comparación y su PDF. */
export interface DermaOutcome {
  /** `selected`: confirmó un candidato; `corrected`: lo cambió por otro de la
   * lista; `pending`: sin confirmar, `title` es la propuesta de la IA. */
  kind: "selected" | "corrected" | "pending";
  title: string;
  notes: string | null;
  /** Código CIE: el del candidato elegido o el principal de la IA. */
  icd: string | null;
}

export interface DermaOutcomeAnalysis {
  isConfirmed: boolean;
  isCorrected: boolean;
  finalDiagnosis: string | null;
  finalDiagnosisCode?: string | null;
  doctorNotes?: string | null;
  aiDiagnosis?: string | null;
  aiRawResponse?: unknown;
}

function clean(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/** Lo que confirmó o corrigió el profesional; null si aún no lo hizo. */
export function dermaConfirmedOutcome(analysis: DermaOutcomeAnalysis): DermaOutcome | null {
  const title = clean(analysis.finalDiagnosis);
  if (!analysis.isConfirmed || !title) return null;
  const prediction = analysis.aiRawResponse as AnalisisDermaPiel360Prediction | null | undefined;
  const code = analysis.finalDiagnosisCode;
  // El ICD solo existe para el diagnóstico principal de la IA o para el
  // candidato que lo trae.
  const icd = code
    ? prediction?.topn?.find((item) => item.class_raw === code)?.lesion_code
    : prediction?.lesion_code;
  return {
    kind: analysis.isCorrected ? "corrected" : "selected",
    title,
    notes: clean(analysis.doctorNotes),
    icd: clean(icd),
  };
}

/** El diagnóstico que cuenta: el del profesional o, sin confirmar, el
 * principal de la IA (con su nombre en español). */
export function dermaOutcome(analysis: DermaOutcomeAnalysis): DermaOutcome | null {
  const confirmed = dermaConfirmedOutcome(analysis);
  if (confirmed) return confirmed;
  const prediction = analysis.aiRawResponse as AnalisisDermaPiel360Prediction | null | undefined;
  const top = prediction?.topn?.[0];
  const title =
    clean(analisisDermaPiel360DiagnosisLabel(top?.class ?? prediction?.class, top?.class_raw ?? prediction?.class_raw)) ??
    clean(analysis.aiDiagnosis);
  if (!title) return null;
  return {
    kind: "pending",
    title,
    notes: clean(analysis.doctorNotes),
    icd: clean(top?.lesion_code ?? prediction?.lesion_code),
  };
}
