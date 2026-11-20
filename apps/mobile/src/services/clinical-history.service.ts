import type {
  ClinicalHistoryCatalogGroup,
  ClinicalProfileDraft,
} from '../data/clinicalHistoryOptions';
import { apiRequest } from './api.client';

type ClinicalHistorySaveInput = {
  profile: Record<string, string | null>;
  consents: { photos: boolean | null; informed: boolean | null };
  answers: Record<string, boolean | null>;
};

function optNull(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}

/** Arma el PUT completo de historia clínica (igual que el CRM). */
export function toClinicalHistoryInput(
  draft: ClinicalProfileDraft,
): ClinicalHistorySaveInput {
  return {
    profile: {
      consultationReason: optNull(draft.consultationReason),
      sunExposure: optNull(draft.sunExposure),
      cosmeticRoutine: optNull(draft.cosmeticRoutine),
      recentProcedures: optNull(draft.recentProcedures),
      relevantMedication: optNull(draft.relevantMedication),
      knownAllergies: optNull(draft.knownAllergies),
      dermatologicalHistory: optNull(draft.dermatologicalHistory),
      frequentSensitivity: optNull(draft.frequentSensitivity),
      pregnancyLactation: optNull(draft.pregnancyLactation),
      smoking: optNull(draft.smoking),
      alcohol: optNull(draft.alcohol),
      sleepQuality: optNull(draft.sleepQuality),
      stressLevel: optNull(draft.stressLevel),
      menopause: optNull(draft.menopause),
      pcos: optNull(draft.pcos),
      contraceptiveMethod: optNull(draft.contraceptiveMethod),
      expectations: optNull(draft.expectations),
      recoveryAvailability: optNull(draft.recoveryAvailability),
      aestheticHistoryDetail: optNull(draft.aestheticHistoryDetail),
    },
    consents: {
      photos: draft.consents.photos,
      informed: draft.consents.informed,
    },
    answers: draft.answers,
  };
}

export const clinicalHistoryService = {
  /** Preguntas Sí/No del catálogo (alta, sin paciente todavía). */
  async catalog(): Promise<ClinicalHistoryCatalogGroup[]> {
    const raw = await apiRequest<ClinicalHistoryCatalogGroup[] | null>(
      '/clinical-history/catalog',
      { auth: true },
    );
    return Array.isArray(raw) ? raw : [];
  },

  async save(patientId: string, draft: ClinicalProfileDraft): Promise<void> {
    await apiRequest(`/patients/${patientId}/clinical-history`, {
      method: 'PUT',
      auth: true,
      body: toClinicalHistoryInput(draft),
    });
  },
};
