import { PATIENT_GENDER_OPTIONS } from "@/lib/patient-form-options";

/** Fechas de la ficha: «19 may. 2001». */
export function formatProfileDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function genderLabel(value: string | null): string {
  return PATIENT_GENDER_OPTIONS.find((o) => o.value === value)?.label ?? "Sin registrar";
}

export function exerciseLabel(value: string | null): string {
  if (value === "regular") return "Regular";
  if (value === "sometimes") return "A veces";
  if (value === "never") return "Nunca";
  return "—";
}

export function birthTypeLabel(value: string | null): string {
  if (value === "cesarean") return "Cesárea";
  if (value === "normal") return "Normal";
  return "—";
}
