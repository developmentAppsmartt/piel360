/** Solicitudes de soporte del panel (formulario de «Soporte»). */
export const SUPPORT_REQUEST_TYPES = [
  { value: "platform", label: "Problema con la plataforma" },
  { value: "plans", label: "Planes y pagos" },
  { value: "analysis", label: "Análisis y resultados" },
  { value: "account", label: "Mi cuenta" },
  { value: "other", label: "Otro" },
] as const;

export type SupportRequestType = (typeof SUPPORT_REQUEST_TYPES)[number]["value"];

export const SUPPORT_REQUEST_TYPE_VALUES = SUPPORT_REQUEST_TYPES.map((o) => o.value);

export function supportRequestTypeLabel(value: string): string {
  return SUPPORT_REQUEST_TYPES.find((o) => o.value === value)?.label ?? value;
}

/** Adjunto opcional: una captura o un PDF. */
export const SUPPORT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
