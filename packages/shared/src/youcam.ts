import type { YouCamAction } from "./constants.js";

export type YouCamTaskStatus = "success" | "error" | "processing";

/** Item de `checkStatus().results.output[]` (INTEGRACIONES-IA.md §2.4).
 * Además de las 16 métricas hd_* con máscara, YouCam manda entradas
 * especiales sin `mask_urls`: `all` (puntaje general) y `skin_age` (edad de
 * piel estimada, ambos en `score`), y `resize_image` (metadata interna del
 * redimensionado automático, sin puntaje — no es un resultado clínico). */
export interface YouCamOutputItem {
  type: YouCamAction | "all" | "skin_age" | "resize_image";
  mask_urls?: string[];
  /** Presente para métricas con más de una zona (ej. `hd_pore` con
   * forehead/nose/cheek/whole) — sin esto, distintas regiones del mismo
   * `type` no se pueden distinguir. */
  region?: string;
  /** Puntaje pensado para mostrar al usuario final (0-100, ajustado). */
  ui_score?: number;
  /** Puntaje crudo del modelo (0-100, no ajustado). */
  raw_score?: number;
  /** Solo en `type: "hd_skin_type"` — ej. "Combination", "Oily", "Normal". */
  skin_type?: string;
  /** Solo en `type: "all"` (puntaje general) o `"skin_age"` (edad estimada). */
  score?: number;
  [key: string]: unknown;
}

/** Resultados de una tarea YouCam completada (INTEGRACIONES-IA.md §2.4). */
export interface YouCamResults {
  output: YouCamOutputItem[];
}

/** Payload de `POST /webhooks/youcam` (INTEGRACIONES-IA.md §2.5). */
export interface YouCamWebhookPayload {
  data: {
    taskId: string;
    taskStatus: YouCamTaskStatus;
  };
}
