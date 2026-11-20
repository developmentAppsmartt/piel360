/** Opciones del alta de paciente — espejo de apps/mobile/.../patientFormOptions.ts */

/** Tipos de documento (lista DIAN) para el alta y edición de pacientes. */
export const PATIENT_DOC_TYPE_OPTIONS = [
  { value: "11-Registro civil", label: "11-Registro civil" },
  { value: "12-Tarjeta de Identidad", label: "12-Tarjeta de Identidad" },
  { value: "13-Cédula de Ciudadanía", label: "13-Cédula de Ciudadanía" },
  { value: "21-Tarjeta de extranjería", label: "21-Tarjeta de extranjería" },
  { value: "22-Cédula de Extranjería", label: "22-Cédula de Extranjería" },
  { value: "31-Nit", label: "31-Nit" },
  { value: "41-Pasaporte", label: "41-Pasaporte" },
  {
    value: "42-Documento de identificación extranjero",
    label: "42-Documento de identificación extranjero",
  },
  { value: "47-PEP", label: "47-PEP" },
] as const;

export const DEFAULT_PATIENT_DOC_TYPE = "13-Cédula de Ciudadanía" as const;

const PATIENT_DOC_TYPE_LEGACY: Record<string, string> = {
  CC: "13-Cédula de Ciudadanía",
  CE: "22-Cédula de Extranjería",
  TI: "12-Tarjeta de Identidad",
  PA: "41-Pasaporte",
  NIT: "31-Nit",
  RC: "11-Registro civil",
  TE: "21-Tarjeta de extranjería",
  DIE: "42-Documento de identificación extranjero",
  PEP: "47-PEP",
};

export function normalizePatientDocType(
  raw: string | null | undefined,
): string {
  if (!raw?.trim()) return DEFAULT_PATIENT_DOC_TYPE;
  const value = raw.trim();
  if (PATIENT_DOC_TYPE_LEGACY[value]) return PATIENT_DOC_TYPE_LEGACY[value];
  if (PATIENT_DOC_TYPE_OPTIONS.some((o) => o.value === value)) return value;
  return value;
}

/** @deprecated Preferir PATIENT_DOC_TYPE_OPTIONS. */
export const PATIENT_DOC_TYPES = PATIENT_DOC_TYPE_OPTIONS.map((o) => o.value);

export const PATIENT_GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
] as const;

export const PATIENT_MASCOT_OPTIONS = [
  { value: "dog", label: "Perro" },
  { value: "cat", label: "Gato" },
  { value: "other", label: "Otro" },
  { value: "none", label: "Ninguna" },
] as const;

export const PATIENT_BIRTH_TYPE_OPTIONS = [
  { value: "normal", label: "Nacimiento Normal" },
  { value: "cesarean", label: "Nacimiento por Cesárea" },
] as const;

export const PATIENT_EXERCISE_HABIT_OPTIONS = [
  { value: "regular", label: "Sí, regularmente" },
  { value: "sometimes", label: "A veces" },
  { value: "never", label: "No, nunca" },
] as const;

export const PATIENT_EXERCISE_DAYS_OPTIONS = [
  { value: "1-2", label: "1-2 días" },
  { value: "3-4", label: "3-4 días" },
  { value: "5-6", label: "5-6 días" },
  { value: "7", label: "7 días" },
  { value: "none", label: "Ninguno" },
] as const;

export const PATIENT_EXERCISE_DURATION_OPTIONS = [
  { value: "lt30", label: "Menos de 30 min" },
  { value: "30-60", label: "30-60 min" },
  { value: "60-90", label: "60-90 min" },
  { value: "gt90", label: "Más de 90 min" },
] as const;

export const PATIENT_SKIN_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "dry", label: "Seca" },
  { value: "oily", label: "Grasa" },
  { value: "mixed", label: "Mixta" },
] as const;

/** `patients.skin_type` guarda el valor del formulario en inglés (`oily`). */
export function patientSkinTypeLabel(value: string | null): string {
  if (!value) return "—";
  return PATIENT_SKIN_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export const PATIENT_FITZ_OPTIONS = [
  {
    value: "I",
    color: "#F8E4D4",
    hint: "Piel muy clara, siempre se quema, nunca se broncea.",
  },
  {
    value: "II",
    color: "#E8C4A8",
    hint: "Piel clara, suele quemarse, bronceado mínimo.",
  },
  {
    value: "III",
    color: "#D1A074",
    hint: "Clara a intermedia, a veces se quema.",
  },
  {
    value: "IV",
    color: "#A67C52",
    hint: "Intermedia, rara vez se quema.",
  },
  {
    value: "V",
    color: "#8D5524",
    hint: "Oscura, casi nunca se quema.",
  },
  {
    value: "VI",
    color: "#5C3317",
    hint: "Muy oscura, nunca se quema.",
  },
] as const;
