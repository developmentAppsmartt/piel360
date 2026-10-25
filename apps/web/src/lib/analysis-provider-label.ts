// Fuente de verdad: AnalysisProvider.displayLabel (backend). Estas constantes
// cubren botones para iniciar un análisis nuevo (aún sin fila `provider`).
// El navegador solo conoce los slugs públicos: el API los enmascara al
// serializar (ver `provider-public-alias.ts`).
import type { PublicAnalysisProviderSlug } from "@piel360/shared";

export const ANALYSIS_PROVIDER_STATIC_LABELS: Record<
  PublicAnalysisProviderSlug,
  string
> = {
  analisisdermapiel360: "Análisis Dermatológico Piel 360",
  analisispiel360: "Análisis Estético Piel 360",
  fitzpatrick: "Análisis de Fototipo Piel 360",
};

/** Label a mostrar para un análisis ya existente: prioriza
 * `provider.displayLabel`, que el API ya entrega enmascarado; si viene vacío,
 * heurística por task id. */
export function analysisProviderLabel(row: {
  analisisPiel360TaskId: string | null;
  fitzpatrickTaskId?: string | null;
  provider?: { displayLabel: string | null } | null;
}): string {
  const raw = row.provider?.displayLabel?.trim();
  if (raw) return raw;
  if (row.analisisPiel360TaskId) return ANALYSIS_PROVIDER_STATIC_LABELS.analisispiel360;
  if (row.fitzpatrickTaskId) return ANALYSIS_PROVIDER_STATIC_LABELS.fitzpatrick;
  return ANALYSIS_PROVIDER_STATIC_LABELS.analisisdermapiel360;
}
