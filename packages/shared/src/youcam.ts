import type { YouCamAction } from "./constants.js";

export type YouCamTaskStatus = "success" | "error" | "processing";

/** Item de `checkStatus().results.output[]` (INTEGRACIONES-IA.md §2.4). */
export interface YouCamOutputItem {
  type: YouCamAction;
  mask_urls: string[];
  /** Presente para métricas con más de una zona (ej. `hd_pore` con
   * forehead/nose/cheek/whole) — sin esto, distintas regiones del mismo
   * `type` no se pueden distinguir. */
  region?: string;
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
