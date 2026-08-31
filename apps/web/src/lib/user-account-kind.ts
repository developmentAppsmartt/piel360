export type UserAccountKind = "empresa" | "profesional" | "paciente";

type DoctorFlags = {
  empresa: boolean;
  empresaReferida: boolean;
  membershipType: string;
} | null;

function isEnterpriseDoctor(doctor: NonNullable<DoctorFlags>): boolean {
  const type = (doctor.membershipType ?? "").trim().toLowerCase();
  return (
    type === "empresa" ||
    type === "empresa_aliada" ||
    doctor.empresa ||
    doctor.empresaReferida
  );
}

export function resolveUserAccountKind(input: {
  doctor?: DoctorFlags;
  patient?: { id: string } | null;
}): UserAccountKind {
  if (input.doctor) {
    return isEnterpriseDoctor(input.doctor) ? "empresa" : "profesional";
  }
  if (input.patient) return "paciente";
  return "paciente";
}

export const USER_ACCOUNT_KIND_LABELS: Record<UserAccountKind, string> = {
  empresa: "Empresa",
  profesional: "Profesional",
  paciente: "Paciente",
};
