/** Los 6 tipos de la escala Fitzpatrick (docs/ai_fitzpatrick_skin_type.md). */
export const FITZPATRICK_SCALES = ["I", "II", "III", "IV", "V", "VI"] as const;
export type FitzpatrickScale = (typeof FITZPATRICK_SCALES)[number];

/** `data.results` de `GET /s2s/v2.0/task/fitzpatrick-scale-analyzer/{task_id}`
 * cuando `task_status === "success"` — confirmado con una respuesta real. */
export interface FitzpatrickResult {
  fitzpatrick_scale: FitzpatrickScale;
  timed: number;
}
