// Fuente de verdad: AnalysisProvider.displayLabel (backend). Estas constantes
// cubren botones para iniciar un análisis nuevo (aún sin fila `provider`).
// Nunca exponer nombres de API (Skiniver / YouCam / Fitzpatrick) al usuario.
export const ANALYSIS_PROVIDER_STATIC_LABELS = {
  skiniver: "Piel 360 AI · Dermatológico",
  youcam: "Piel 360 AI · Estético",
  fitzpatrick: "Piel 360 AI · Fototipo",
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
  if (row.youcamTaskId) return ANALYSIS_PROVIDER_STATIC_LABELS.youcam;
  if (row.fitzpatrickTaskId) return ANALYSIS_PROVIDER_STATIC_LABELS.fitzpatrick;
  return ANALYSIS_PROVIDER_STATIC_LABELS.skiniver;
}
