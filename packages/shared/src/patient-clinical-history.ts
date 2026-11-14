/**
 * Historia clínica que llena el profesional (tablas `patient_clinical_*`).
 * Es aparte de la encuesta que responde el propio paciente en la app
 * (`patients.survey_responses`). Los `value` son los mismos de los CHECK de la
 * migración `historia_clinica_paciente`: si se cambia uno, se cambian los dos.
 */
type Option<V extends string> = { readonly value: V; readonly label: string };

const yesNoNotApplicable = [
  { value: "yes", label: "Sí" },
  { value: "no", label: "No" },
  { value: "not_applicable", label: "No aplica" },
] as const;

const noneOccasionalFrequent = (none: string) =>
  [
    { value: "none", label: none },
    { value: "occasional", label: "Ocasional" },
    { value: "frequent", label: "Frecuente" },
  ] as const;

export const CLINICAL_OPTIONS = {
  sunExposure: [
    { value: "low", label: "Baja" },
    { value: "moderate", label: "Moderada" },
    { value: "high", label: "Alta" },
    { value: "very_high", label: "Muy alta" },
  ],
  frequentSensitivity: [
    { value: "yes", label: "Sí" },
    { value: "no", label: "No" },
    { value: "sometimes", label: "A veces" },
  ],
  pregnancyLactation: yesNoNotApplicable,
  menopause: yesNoNotApplicable,
  pcos: yesNoNotApplicable,
  smoking: noneOccasionalFrequent("No fuma"),
  alcohol: noneOccasionalFrequent("No consume"),
  sleepQuality: [
    { value: "good", label: "Buena" },
    { value: "regular", label: "Regular" },
    { value: "poor", label: "Mala" },
  ],
  stressLevel: [
    { value: "low", label: "Bajo" },
    { value: "medium", label: "Medio" },
    { value: "high", label: "Alto" },
  ],
  recoveryAvailability: [
    { value: "immediate", label: "Inmediata" },
    { value: "few_days", label: "Pocos días" },
    { value: "one_two_weeks", label: "1-2 semanas" },
    { value: "over_two_weeks", label: "Más de 2 semanas" },
  ],
} as const satisfies Record<string, readonly Option<string>[]>;

export type ClinicalOptionField = keyof typeof CLINICAL_OPTIONS;

export type ClinicalOptionValue<F extends ClinicalOptionField> =
  (typeof CLINICAL_OPTIONS)[F][number]["value"];

export function clinicalOptionValues<F extends ClinicalOptionField>(
  field: F,
): ClinicalOptionValue<F>[] {
  return CLINICAL_OPTIONS[field].map((o) => o.value) as ClinicalOptionValue<F>[];
}

/** Campos de texto libre del perfil clínico, con su tope en el DTO. */
export const CLINICAL_TEXT_FIELDS = [
  "consultationReason",
  "cosmeticRoutine",
  "recentProcedures",
  "relevantMedication",
  "knownAllergies",
  "dermatologicalHistory",
  "contraceptiveMethod",
  "expectations",
  "aestheticHistoryDetail",
] as const;

export type ClinicalTextField = (typeof CLINICAL_TEXT_FIELDS)[number];

export const CLINICAL_TEXT_MAX_LENGTH = 1000;

export const CONSENT_TYPES = [
  { value: "photos", label: "Autoriza fotografías antes/después" },
  { value: "informed", label: "Consentimiento informado firmado" },
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number]["value"];

export type PatientClinicalProfile = { [K in ClinicalTextField]: string | null } & {
  [F in ClinicalOptionField]: ClinicalOptionValue<F> | null;
};

/** `GET/PUT /patients/:id/clinical-history`. `answer: null` = sin responder. */
export type PatientClinicalHistory = {
  profile: PatientClinicalProfile;
  consents: Record<ConsentType, boolean | null>;
  groups: {
    key: string;
    label: string;
    items: { key: string; label: string; answer: boolean | null }[];
  }[];
};

export type PatientClinicalHistoryInput = {
  profile: PatientClinicalProfile;
  consents: Record<ConsentType, boolean | null>;
  answers: Record<string, boolean | null>;
};
