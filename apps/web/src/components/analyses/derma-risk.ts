import type {
  AnalisisDermaPiel360Prediction,
  RiskLevel,
} from "@piel360/shared";

/** Colores del riesgo del análisis dermatológico. Una sola tabla para la
 * lista de diagnósticos, su leyenda y los marcadores del historial 3D. */
export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "#22c55e",
  medium: "#facc15",
  high: "#ef4444",
};

export function riskColor(level: string | null | undefined): string | null {
  return level && level in RISK_COLORS ? RISK_COLORS[level as RiskLevel] : null;
}

/** El proveedor manda probabilidades en 0–1 o en 0–100. */
export function percent(prob: number) {
  return prob <= 1 ? prob * 100 : prob;
}

/** Aguja del medidor: solo `high_risk_prob` (`aiProbability` es la
 * probabilidad de la clase, no el riesgo). */
export function gaugePercent(
  prediction: AnalisisDermaPiel360Prediction | null | undefined,
) {
  const raw = prediction?.high_risk_prob;
  if (raw == null || !Number.isFinite(Number(raw))) return 0;
  return percent(Number(raw));
}

/** La respuesta guardada es dermatológica si trae candidatos (`topn`). */
export function dermPrediction(
  raw: unknown,
): AnalisisDermaPiel360Prediction | null {
  const prediction = raw as AnalisisDermaPiel360Prediction | null;
  return Array.isArray(prediction?.topn) ? prediction : null;
}
