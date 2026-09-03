/** diferencia = salud de la piel (años) − edad cronológica. */

export function chronologicalAgeYears(
  birthDate: string | Date | null | undefined,
  atDate: string | Date,
): number | null {
  if (!birthDate) return null;
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const at = atDate instanceof Date ? atDate : new Date(atDate);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return null;
  let age = at.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    at.getMonth() > birth.getMonth() ||
    (at.getMonth() === birth.getMonth() && at.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function skinAgeDifference(
  skinAgeYears: number | null | undefined,
  chronologicalAge: number | null | undefined,
): number | null {
  if (skinAgeYears == null || chronologicalAge == null) return null;
  return Math.round(skinAgeYears) - chronologicalAge;
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

export function formatSignedYears(diff: number): string {
  if (diff > 0) return `+${diff} años`;
  return `${diff} años`;
}
