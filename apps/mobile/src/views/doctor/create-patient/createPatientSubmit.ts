import {
  CLINICAL_TEXT_MAX_LENGTH,
  clinicalTextFieldsOverLimit,
  type ClinicalProfileDraft,
} from '../../../data/clinicalHistoryOptions';
import { DEFAULT_PATIENT_DOC_TYPE } from '../../../data/patientFormOptions';
import {
  isStrongPassword,
  PASSWORD_STRENGTH_MESSAGE,
} from '../../../lib/password';
import { digitsOnly } from '../../../lib/phone';
import type { CreatePatientInput } from '../../../services/patients.service';

export type CreatePatientDraft = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  createAppAccess: boolean;
  docType: string;
  docNumber: string;
  gender: string;
  address: string;
  lat: number | null;
  lng: number | null;
  areaCode: string;
  phone: string;
  birthDate: string;
  birthType: string;
  mascotType: string;
  exerciseHabit: string;
  exerciseDaysPerWeek: string;
  exerciseSessionDuration: string;
  skinType: string;
  fitzpatrickType: string;
  importantNotes: string;
  clinical: ClinicalProfileDraft;
};

export type CreatePatientSubmitValues = {
  patient: CreatePatientInput;
  clinical: ClinicalProfileDraft;
};

/** Valida el alta. Devuelve el error o el payload listo para la API. */
export function resolveCreatePatientSubmit(
  draft: CreatePatientDraft,
): { error: string } | { values: CreatePatientSubmitValues } {
  if (!draft.firstName.trim() || !draft.lastName.trim()) {
    return { error: 'Nombre y apellidos son obligatorios.' };
  }
  const emailTrim = draft.email.trim();
  const passwordTrim = draft.password.trim();
  if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
    return { error: 'Correo inválido.' };
  }
  if (draft.createAppAccess) {
    if (!emailTrim) {
      return { error: 'El correo es obligatorio para crear acceso a la app.' };
    }
    if (!isStrongPassword(passwordTrim)) {
      return { error: PASSWORD_STRENGTH_MESSAGE };
    }
  }
  if (!draft.docNumber.trim()) {
    return { error: 'El número de cédula / documento es obligatorio.' };
  }
  if (draft.docNumber.trim().length < 4) {
    return {
      error: 'El número de documento debe tener al menos 4 caracteres.',
    };
  }
  if (
    draft.birthDate &&
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate.trim())
  ) {
    return { error: 'Fecha inválida. Usa AAAA-MM-DD.' };
  }
  if (clinicalTextFieldsOverLimit(draft.clinical)) {
    return {
      error: `Los textos clínicos admiten hasta ${CLINICAL_TEXT_MAX_LENGTH} caracteres.`,
    };
  }

  const opt = (v: string) => (v.trim() ? v.trim() : undefined);
  const areaDigits = digitsOnly(draft.areaCode);

  return {
    values: {
      patient: {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        email: emailTrim || undefined,
        createAppAccess: draft.createAppAccess,
        ...(draft.createAppAccess ? { password: passwordTrim } : {}),
        docType: draft.docType.trim() || DEFAULT_PATIENT_DOC_TYPE,
        docNumber: draft.docNumber.trim(),
        gender: opt(draft.gender),
        address: opt(draft.address),
        ...(draft.lat != null && draft.lng != null
          ? { lat: draft.lat, lng: draft.lng }
          : {}),
        areaCode: areaDigits ? `+${areaDigits}` : undefined,
        phone: opt(draft.phone),
        birthDate: opt(draft.birthDate),
        birthType: opt(draft.birthType),
        mascotType: opt(draft.mascotType),
        exerciseHabit: opt(draft.exerciseHabit),
        exerciseDaysPerWeek: opt(draft.exerciseDaysPerWeek),
        exerciseSessionDuration: opt(draft.exerciseSessionDuration),
        skinType: opt(draft.skinType),
        fitzpatrickType: opt(draft.fitzpatrickType),
        importantNotes: opt(draft.importantNotes),
      },
      clinical: draft.clinical,
    },
  };
}
