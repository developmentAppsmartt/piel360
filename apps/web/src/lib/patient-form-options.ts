/** Opciones del alta de paciente — espejo de apps/mobile/.../patientFormOptions.ts */

export const PATIENT_DOC_TYPES = ["CC", "CE", "TI", "PA"] as const;

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
