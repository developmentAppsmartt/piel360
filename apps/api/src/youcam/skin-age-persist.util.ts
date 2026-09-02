import type { Prisma } from '@prisma/client';
import {
  computeSkinAgeSnapshot,
  readYoucamSkinAgeYears,
  type SkinAgeSnapshot,
} from './skin-age-snapshot.util';

type PatientSkinAgeRow = {
  lastSkinAgeAt: Date | null;
};

export function snapshotFromAnalysis(input: {
  aiRawResponse: unknown;
  birthDate: Date | null | undefined;
  analysisDate: Date;
}): SkinAgeSnapshot {
  return computeSkinAgeSnapshot({
    skinAgeYears: readYoucamSkinAgeYears(input.aiRawResponse),
    birthDate: input.birthDate,
    analysisDate: input.analysisDate,
  });
}

export function snapshotHasValues(snap: SkinAgeSnapshot): boolean {
  return (
    snap.skinAgeYears != null ||
    snap.chronologicalAgeYears != null ||
    snap.skinAgeDifference != null
  );
}

/** Actualiza el último snapshot del paciente si este análisis es más reciente. */
export function patientLatestSkinAgeData(
  patient: PatientSkinAgeRow,
  analysisDate: Date,
  snap: SkinAgeSnapshot,
): Prisma.PatientUpdateInput | null {
  if (!snapshotHasValues(snap)) return null;
  if (patient.lastSkinAgeAt && patient.lastSkinAgeAt > analysisDate) {
    return null;
  }
  return {
    lastSkinAgeYears: snap.skinAgeYears,
    lastChronologicalAgeYears: snap.chronologicalAgeYears,
    lastSkinAgeDifference: snap.skinAgeDifference,
    lastSkinAgeAt: analysisDate,
  };
}
