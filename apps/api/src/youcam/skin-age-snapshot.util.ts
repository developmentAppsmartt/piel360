/**
 * Snapshot de edad de piel para CRM / app.
 *
 * diferencia = Salud de la piel (años) − edad cronológica
 *   < 0  piel más joven
 *   = 0  corresponde a la edad
 *   > 0  se ve más envejecida
 */

export function chronologicalAgeYears(birthDate: Date, atDate: Date): number {
  let age = atDate.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    atDate.getMonth() > birthDate.getMonth() ||
    (atDate.getMonth() === birthDate.getMonth() &&
      atDate.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function readYoucamSkinAgeYears(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const output = (raw as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;
  const item = output.find(
    (row) =>
      row &&
      typeof row === 'object' &&
      (row as { type?: unknown }).type === 'skin_age',
  ) as
    | { score?: unknown; ui_score?: unknown; raw_score?: unknown }
    | undefined;
  if (!item) return null;
  const value = [item.score, item.ui_score, item.raw_score].find(
    (n): n is number => typeof n === 'number' && Number.isFinite(n),
  );
  return value ?? null;
}

export type SkinAgeSnapshot = {
  skinAgeYears: number | null;
  chronologicalAgeYears: number | null;
  skinAgeDifference: number | null;
};

export function computeSkinAgeSnapshot(input: {
  skinAgeYears: number | null;
  birthDate: Date | null | undefined;
  analysisDate: Date;
}): SkinAgeSnapshot {
  const skinAgeYears =
    input.skinAgeYears != null && Number.isFinite(input.skinAgeYears)
      ? Math.round(input.skinAgeYears)
      : null;
  const chronological =
    input.birthDate != null
      ? chronologicalAgeYears(input.birthDate, input.analysisDate)
      : null;
  const skinAgeDifference =
    skinAgeYears != null && chronological != null
      ? skinAgeYears - chronological
      : null;
  return {
    skinAgeYears,
    chronologicalAgeYears: chronological,
    skinAgeDifference,
  };
}

export function skinAgeDifferenceMessage(diff: number): string {
  if (diff < 0) {
    return 'La piel se ve mucho más joven que la edad cronológica.';
  }
  if (diff === 0) {
    return 'La piel corresponde a la edad cronológica.';
  }
  return 'La piel se ve más envejecida que la edad cronológica.';
}
