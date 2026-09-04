/** Roles de equipo configurables en el wizard de planes (empresa). */
export type PlanRoleOption = {
  key: string;
  label: string;
  group: "specialty" | "labor";
};

/** Fallback estático alineado con especialidades / técnicos del sistema. */
export const PLAN_ROLE_OPTIONS: PlanRoleOption[] = [
  { key: "dermatologo", label: "Dermatólogo", group: "specialty" },
  { key: "medico_general", label: "Médico general", group: "specialty" },
  { key: "medicoestetico", label: "Médico estético", group: "specialty" },
  { key: "cirujano_plastico", label: "Cirujano plástico", group: "specialty" },
  { key: "cosmetologo", label: "Cosmetólogo", group: "specialty" },
  { key: "estetica_medica", label: "Estética médica", group: "specialty" },
  { key: "otra", label: "Otra", group: "specialty" },
  {
    key: "tecnico_laboral_cosmetologia_estetica",
    label: "Técnico laboral en cosmetología y estética",
    group: "labor",
  },
];

export type PlanRoleKey = string;

export function planRoleLabel(key: string) {
  return PLAN_ROLE_OPTIONS.find((role) => role.key === key)?.label ?? key;
}

export function planRoleOptionsFromCatalog(input: {
  specialties?: { slug: string; name: string; isActive?: boolean }[];
  laborProfiles?: { slug: string; name: string; isActive?: boolean }[];
}): PlanRoleOption[] {
  const specialties = (input.specialties ?? [])
    .filter((item) => item.isActive !== false)
    .map((item) => ({
      key: item.slug,
      label: item.name,
      group: "specialty" as const,
    }));
  const labor = (input.laborProfiles ?? [])
    .filter((item) => item.isActive !== false)
    .map((item) => ({
      key: item.slug,
      label: item.name,
      group: "labor" as const,
    }));

  if (specialties.length === 0 && labor.length === 0) {
    return PLAN_ROLE_OPTIONS;
  }
  return [...specialties, ...labor];
}
