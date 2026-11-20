import type { AppIconName } from '../components/icons';
import { Icons } from '../components/icons';

export const PATIENT_GENDER_OPTIONS = [
  { value: 'female', label: 'Femenino' },
  { value: 'male', label: 'Masculino' },
  { value: 'other', label: 'Otro' },
] as const;

/** Tipos de documento (lista DIAN) para el alta y edición de pacientes. */
export const PATIENT_DOC_TYPE_OPTIONS = [
  { value: '11-Registro civil', label: '11-Registro civil' },
  { value: '12-Tarjeta de Identidad', label: '12-Tarjeta de Identidad' },
  { value: '13-Cédula de Ciudadanía', label: '13-Cédula de Ciudadanía' },
  { value: '21-Tarjeta de extranjería', label: '21-Tarjeta de extranjería' },
  { value: '22-Cédula de Extranjería', label: '22-Cédula de Extranjería' },
  { value: '31-Nit', label: '31-Nit' },
  { value: '41-Pasaporte', label: '41-Pasaporte' },
  {
    value: '42-Documento de identificación extranjero',
    label: '42-Documento de identificación extranjero',
  },
  { value: '47-PEP', label: '47-PEP' },
] as const;

export const DEFAULT_PATIENT_DOC_TYPE =
  '13-Cédula de Ciudadanía' as const;

/** Códigos cortos que ya podían estar guardados. */
const PATIENT_DOC_TYPE_LEGACY: Record<string, string> = {
  CC: '13-Cédula de Ciudadanía',
  CE: '22-Cédula de Extranjería',
  TI: '12-Tarjeta de Identidad',
  PA: '41-Pasaporte',
  NIT: '31-Nit',
  RC: '11-Registro civil',
  TE: '21-Tarjeta de extranjería',
  DIE: '42-Documento de identificación extranjero',
  PEP: '47-PEP',
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
export const PATIENT_DOC_TYPES = PATIENT_DOC_TYPE_OPTIONS.map(
  (o) => o.value,
);

/** Antes de las opciones con Icons: si el catálogo de iconos falla al
 * evaluar, el fototipo igual tiene que exportarse (Hermes: «Property
 * PATIENT_FITZ_OPTIONS doesn't exist»). */
export const PATIENT_FITZ_OPTIONS = [
  {
    value: 'I',
    color: '#F8E4D4',
    hint: 'Piel muy clara, siempre se quema, nunca se broncea.',
  },
  {
    value: 'II',
    color: '#E8C4A8',
    hint: 'Piel clara, suele quemarse, bronceado mínimo.',
  },
  {
    value: 'III',
    color: '#D1A074',
    hint: 'Clara a intermedia, a veces se quema.',
  },
  {
    value: 'IV',
    color: '#A67C52',
    hint: 'Intermedia, rara vez se quema.',
  },
  {
    value: 'V',
    color: '#8D5524',
    hint: 'Oscura, casi nunca se quema.',
  },
  {
    value: 'VI',
    color: '#5C3317',
    hint: 'Muy oscura, nunca se quema.',
  },
] as const;

export const PATIENT_SKIN_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'dry', label: 'Seca' },
  { value: 'oily', label: 'Grasa' },
  { value: 'mixed', label: 'Mixta' },
] as const;

export const PATIENT_MASCOT_OPTIONS: {
  value: string;
  label: string;
  icon: AppIconName;
}[] = [
  { value: 'dog', label: 'Perro', icon: Icons.dog },
  { value: 'cat', label: 'Gato', icon: Icons.cat },
  { value: 'other', label: 'Otro', icon: Icons.paw },
  { value: 'none', label: 'Ninguna', icon: Icons.close },
];

export const PATIENT_BIRTH_TYPE_OPTIONS: {
  value: string;
  label: string;
  icon: AppIconName;
}[] = [
  { value: 'normal', label: 'Nacimiento Normal', icon: Icons.smile },
  { value: 'cesarean', label: 'Nacimiento por Cesárea', icon: Icons.account },
];

export const PATIENT_EXERCISE_HABIT_OPTIONS: {
  value: string;
  label: string;
  icon: AppIconName;
  color: string;
}[] = [
  {
    value: 'regular',
    label: 'Sí, regularmente',
    icon: Icons.heartPulse,
    color: '#22C55E',
  },
  {
    value: 'sometimes',
    label: 'A veces',
    icon: Icons.smile,
    color: '#F97316',
  },
  {
    value: 'never',
    label: 'No, nunca',
    icon: Icons.sad,
    color: '#EF4444',
  },
];

export const PATIENT_EXERCISE_DAYS_OPTIONS: {
  value: string;
  label: string;
  color: string;
}[] = [
  { value: '1-2', label: '1-2 días', color: '#22C55E' },
  { value: '3-4', label: '3-4 días', color: '#F97316' },
  { value: '5-6', label: '5-6 días', color: '#3B82F6' },
  { value: '7', label: '7 días', color: '#8B5CF6' },
  { value: 'none', label: 'Ninguno', color: '#EF4444' },
];

export const PATIENT_EXERCISE_DURATION_OPTIONS: {
  value: string;
  label: string;
  color: string;
}[] = [
  { value: 'lt30', label: 'Menos de 30 min', color: '#22C55E' },
  { value: '30-60', label: '30-60 min', color: '#F97316' },
  { value: '60-90', label: '60-90 min', color: '#3B82F6' },
  { value: 'gt90', label: 'Más de 90 min', color: '#8B5CF6' },
];
