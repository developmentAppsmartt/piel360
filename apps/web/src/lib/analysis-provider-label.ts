// Fuente de verdad: AnalysisProvider.displayLabel (backend) — evita repetir
// "Análisis Dermatológico"/"Análisis Estético" hardcodeado en cada componente
// que muestra un análisis existente. Estas constantes solo cubren los 2 casos
// que NO leen de un `Analysis` ya creado (botones para iniciar un análisis
// nuevo, antes de que exista una fila con `provider` que consultar).
export const ANALYSIS_PROVIDER_STATIC_LABELS = {
  skiniver: "Análisis Dermatológico",
  youcam: "Análisis Estético",
  fitzpatrick: "Análisis Fitzpatrick",
} as const;

/** Label a mostrar para un análisis ya existente: prioriza
 * `provider.displayLabel` (base de datos); si la fila es de antes de que
 * `providerId` se empezara a guardar (o no tiene provider vinculado), cae al
 * mismo texto vía el heurístico ya usado en el resto del código
 * (`youcamTaskId` presente → YouCam). */
export function analysisProviderLabel(row: {
  youcamTaskId: string | null;
  provider?: { displayLabel: string | null } | null;
}): string {
  return (
    row.provider?.displayLabel ??
    (row.youcamTaskId
      ? ANALYSIS_PROVIDER_STATIC_LABELS.youcam
      : ANALYSIS_PROVIDER_STATIC_LABELS.skiniver)
  );
}
