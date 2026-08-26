export const DOCTOR_DOC_TYPES = ['CC', 'CE', 'TI', 'PA'] as const;

export const DOCTOR_GENDER_OPTIONS = [
  { value: 'female', label: 'Femenino' },
  { value: 'male', label: 'Masculino' },
  { value: 'other', label: 'Otro' },
] as const;

export const DOCTOR_SPECIALTIES = [
  'Dermatólogo',
  'Médico general',
  'Cirujano plástico',
  'Estética médica',
  'Otra',
] as const;
