/** Roles de equipo configurables en el wizard de planes (empresa). */
export const PLAN_ROLE_OPTIONS = [
  { key: "dermatologo", label: "Dermatólogo" },
  { key: "medico_estetico", label: "Médico estético" },
  { key: "esteticista", label: "Esteticista" },
  { key: "tecnico_laboral", label: "Técnico laboral" },
  { key: "administrador", label: "Administrador de clínica" },
] as const;

export type PlanRoleKey = (typeof PLAN_ROLE_OPTIONS)[number]["key"];

export function planRoleLabel(key: string) {
  return PLAN_ROLE_OPTIONS.find((role) => role.key === key)?.label ?? key;
}
