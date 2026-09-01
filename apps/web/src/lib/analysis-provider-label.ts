// Fuente de verdad: AnalysisProvider.displayLabel (backend). Estas constantes
// cubren botones para iniciar un análisis nuevo (aún sin fila `provider`).
// Nunca exponer nombres de API al usuario — y las CLAVES de este objeto
// tampoco deben coincidir con los `slug` reales del backend (aparecerían
// legibles en el bundle de JS aunque el valor ya esté sanitizado).
export const ANALYSIS_PROVIDER_STATIC_LABELS = {
  dermatologico: "Piel 360 AI · Dermatológico",
  estetico: "Piel 360 AI · Estético",
  fototipo: "Piel 360 AI · Fototipo",
} as const;

function looksLikeApiVendor(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes("skiniver") ||
    lower.includes("youcam") ||
    lower.includes("fitzpatrick") ||
    lower.includes("perfect")
  );
}

/** Label a mostrar para un análisis ya existente: prioriza
 * `provider.displayLabel` si no es un nombre de API; si no, heurística por task id. */
export function analysisProviderLabel(row: {
  youcamTaskId: string | null;
  fitzpatrickTaskId?: string | null;
  provider?: { displayLabel: string | null } | null;
}): string {
  const raw = row.provider?.displayLabel?.trim();
  if (raw && !looksLikeApiVendor(raw)) return raw;
  if (row.youcamTaskId) return ANALYSIS_PROVIDER_STATIC_LABELS.estetico;
  if (row.fitzpatrickTaskId) return ANALYSIS_PROVIDER_STATIC_LABELS.fototipo;
  return ANALYSIS_PROVIDER_STATIC_LABELS.dermatologico;
}
