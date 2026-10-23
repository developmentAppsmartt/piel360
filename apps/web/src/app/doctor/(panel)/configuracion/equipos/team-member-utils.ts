export type TeamMemberFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  professionalKind: "specialty" | "labor" | "";
  specialty: string;
  laborProfile: string;
};

export function resolveMemberSpecialty(values: TeamMemberFormValues) {
  if (values.professionalKind === "labor") return values.laborProfile;
  if (values.professionalKind === "specialty") return values.specialty;
  return values.laborProfile || values.specialty;
}

export function inferMemberRoleLabel(
  specialty: string | null,
  laborProfileSet: Set<string>,
): string {
  if (specialty && laborProfileSet.has(specialty)) return "Técnico laboral";
  if (!specialty) return "Profesional";
  const lower = specialty.toLowerCase();
  if (lower.includes("dermatolog")) return "Dermatólogo";
  if (lower.includes("estétic") || lower.includes("estetic")) {
    return "Médico estético";
  }
  if (lower.includes("cosmet")) return "Esteticista";
  return "Profesional";
}
