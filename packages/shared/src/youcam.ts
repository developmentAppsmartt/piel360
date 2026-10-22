import type { AnalisisPiel360Action } from "./constants.js";

export type AnalisisPiel360TaskStatus = "success" | "error" | "processing";

/** Item de `checkStatus().results.output[]` (INTEGRACIONES-IA.md §2.4). */
export interface AnalisisPiel360OutputItem {
  type: AnalisisPiel360Action;
  mask_urls: string[];
  /** Presente para métricas con más de una zona (ej. `hd_pore` con
   * forehead/nose/cheek/whole) — sin esto, distintas regiones del mismo
   * `type` no se pueden distinguir. */
  region?: string;
  [key: string]: unknown;
}

/** Resultados de una tarea YouCam completada (INTEGRACIONES-IA.md §2.4). */
export interface AnalisisPiel360Results {
  output: AnalisisPiel360OutputItem[];
}

/** Payload de `POST /webhooks/youcam` (INTEGRACIONES-IA.md §2.5). */
export interface AnalisisPiel360WebhookPayload {
  data: {
    taskId: string;
    taskStatus: AnalisisPiel360TaskStatus;
  };
}
