/**
 * Espejo de `packages/shared/src/patient-clinical-history.ts`.
 * Metro no resuelve `@piel360/shared`: si cambias el original, copia aquí.
 */

export const CLINICAL_TEXT_MAX_LENGTH = 1000;

export const CLINICAL_SUN_EXPOSURE_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'moderate', label: 'Moderada' },
  { value: 'high', label: 'Alta' },
  { value: 'very_high', label: 'Muy alta' },
] as const;

export const CLINICAL_SENSITIVITY_OPTIONS = [
  { value: 'yes', label: 'Sí' },
  { value: 'no', label: 'No' },
  { value: 'sometimes', label: 'A veces' },
] as const;

export const CLINICAL_YES_NO_NA_OPTIONS = [
  { value: 'yes', label: 'Sí' },
  { value: 'no', label: 'No' },
  { value: 'not_applicable', label: 'No aplica' },
] as const;

/** Misma lista que YES_NO_NA, duplicada: Hermes falla con `export const A = B`. */
export const CLINICAL_PREGNANCY_OPTIONS = [
  { value: 'yes', label: 'Sí' },
  { value: 'no', label: 'No' },
  { value: 'not_applicable', label: 'No aplica' },
] as const;

export const CLINICAL_SMOKING_OPTIONS = [
  { value: 'none', label: 'No fuma' },
  { value: 'occasional', label: 'Ocasional' },
  { value: 'frequent', label: 'Frecuente' },
] as const;

export const CLINICAL_ALCOHOL_OPTIONS = [
  { value: 'none', label: 'No consume' },
  { value: 'occasional', label: 'Ocasional' },
  { value: 'frequent', label: 'Frecuente' },
] as const;

export const CLINICAL_SLEEP_OPTIONS = [
  { value: 'good', label: 'Buena' },
  { value: 'regular', label: 'Regular' },
  { value: 'poor', label: 'Mala' },
] as const;

export const CLINICAL_STRESS_OPTIONS = [
  { value: 'low', label: 'Bajo' },
  { value: 'medium', label: 'Medio' },
  { value: 'high', label: 'Alto' },
] as const;

export const CLINICAL_RECOVERY_OPTIONS = [
  { value: 'immediate', label: 'Inmediata' },
  { value: 'few_days', label: 'Pocos días' },
  { value: 'one_two_weeks', label: '1-2 semanas' },
  { value: 'over_two_weeks', label: 'Más de 2 semanas' },
] as const;

export const CLINICAL_CONSENT_TYPES = [
  { value: 'photos', label: 'Autoriza fotografías antes/después' },
  { value: 'informed', label: 'Consentimiento informado firmado' },
] as const;

export type ClinicalConsentType =
  (typeof CLINICAL_CONSENT_TYPES)[number]['value'];

export type ClinicalHistoryCatalogGroup = {
  key: string;
  label: string;
  items: { key: string; label: string }[];
};

/** Campos string del perfil (el resto va en consents / answers). */
export type ClinicalProfileStrings = {
  consultationReason: string;
  sunExposure: string;
  cosmeticRoutine: string;
  recentProcedures: string;
  relevantMedication: string;
  knownAllergies: string;
  dermatologicalHistory: string;
  frequentSensitivity: string;
  pregnancyLactation: string;
  smoking: string;
  alcohol: string;
  sleepQuality: string;
  stressLevel: string;
  menopause: string;
  pcos: string;
  contraceptiveMethod: string;
  expectations: string;
  recoveryAvailability: string;
  aestheticHistoryDetail: string;
};

export type ClinicalProfileDraft = ClinicalProfileStrings & {
  consents: Record<ClinicalConsentType, boolean | null>;
  /** Clave del catálogo → true/false/null (sin responder). */
  answers: Record<string, boolean | null>;
};

export const EMPTY_CLINICAL_PROFILE: ClinicalProfileDraft = {
  consultationReason: '',
  sunExposure: '',
  cosmeticRoutine: '',
  recentProcedures: '',
  relevantMedication: '',
  knownAllergies: '',
  dermatologicalHistory: '',
  frequentSensitivity: '',
  pregnancyLactation: '',
  smoking: '',
  alcohol: '',
  sleepQuality: '',
  stressLevel: '',
  menopause: '',
  pcos: '',
  contraceptiveMethod: '',
  expectations: '',
  recoveryAvailability: '',
  aestheticHistoryDetail: '',
  consents: { photos: null, informed: null },
  answers: {},
};

const STRING_KEYS: (keyof ClinicalProfileStrings)[] = [
  'consultationReason',
  'sunExposure',
  'cosmeticRoutine',
  'recentProcedures',
  'relevantMedication',
  'knownAllergies',
  'dermatologicalHistory',
  'frequentSensitivity',
  'pregnancyLactation',
  'smoking',
  'alcohol',
  'sleepQuality',
  'stressLevel',
  'menopause',
  'pcos',
  'contraceptiveMethod',
  'expectations',
  'recoveryAvailability',
  'aestheticHistoryDetail',
];

export function clinicalProfileHasData(profile: ClinicalProfileDraft): boolean {
  if (STRING_KEYS.some((k) => (profile[k] ?? '').trim().length > 0)) {
    return true;
  }
  const consents = profile.consents ?? { photos: null, informed: null };
  if (consents.photos != null || consents.informed != null) return true;
  return Object.values(profile.answers ?? {}).some((a) => a !== null);
}

/** Inicializa respuestas del catálogo sin pisar las ya marcadas. */
export function mergeCatalogAnswers(
  draft: ClinicalProfileDraft,
  groups: ClinicalHistoryCatalogGroup[] | null | undefined,
): ClinicalProfileDraft {
  const answers = { ...(draft.answers ?? {}) };
  for (const group of groups ?? []) {
    for (const item of group.items ?? []) {
      if (!(item.key in answers)) answers[item.key] = null;
    }
  }
  return {
    ...draft,
    answers,
    consents: draft.consents ?? { photos: null, informed: null },
  };
}

export function clinicalTextFieldsOverLimit(
  profile: ClinicalProfileDraft,
): boolean {
  return STRING_KEYS.some(
    (k) => profile[k].length > CLINICAL_TEXT_MAX_LENGTH,
  );
}
