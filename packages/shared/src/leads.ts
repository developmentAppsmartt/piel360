/**
 * Contactos de la landing (tabla `leads`). Los `value` son los mismos de los
 * CHECK de la migración `leads_landing`: si se cambia uno, se cambian los dos.
 */
export const LEAD_INTERESTS = [
  { value: "aesthetic", label: "Análisis estético" },
  { value: "derm", label: "Análisis dermatológico" },
  { value: "both", label: "Ambos" },
] as const;

export const LEAD_INTENTS = [
  { value: "demo", label: "Solicitar demo" },
  { value: "meeting", label: "Agendar reunión" },
  { value: "custom_plan", label: "Plan a la medida" },
] as const;

export const LEAD_STATUSES = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "qualified", label: "Calificado" },
  { value: "won", label: "Ganado" },
  { value: "lost", label: "Perdido" },
] as const;

export type LeadInterest = (typeof LEAD_INTERESTS)[number]["value"];
export type LeadIntent = (typeof LEAD_INTENTS)[number]["value"];
export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];

export const LEAD_INTEREST_VALUES = LEAD_INTERESTS.map((o) => o.value);
export const LEAD_INTENT_VALUES = LEAD_INTENTS.map((o) => o.value);
export const LEAD_STATUS_VALUES = LEAD_STATUSES.map((o) => o.value);

const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value;

export const leadInterestLabel = (value: string) => labelOf(LEAD_INTERESTS, value);
export const leadIntentLabel = (value: string) => labelOf(LEAD_INTENTS, value);
export const leadStatusLabel = (value: string) => labelOf(LEAD_STATUSES, value);
