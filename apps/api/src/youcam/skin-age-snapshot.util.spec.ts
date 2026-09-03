import {
  chronologicalAgeYears,
  computeSkinAgeSnapshot,
  readYoucamSkinAgeYears,
  skinAgeDifferenceMessage,
} from './skin-age-snapshot.util';

describe('skin-age-snapshot', () => {
  it('calcula edad cronológica ajustando por cumpleaños', () => {
    const birth = new Date('2006-09-10');
    expect(chronologicalAgeYears(birth, new Date('2026-09-02'))).toBe(19);
    expect(chronologicalAgeYears(birth, new Date('2026-09-10'))).toBe(20);
  });

  it('usa diferencia = salud de la piel − edad cronológica', () => {
    const snap = computeSkinAgeSnapshot({
      skinAgeYears: 22.4,
      birthDate: new Date('2006-09-01'),
      analysisDate: new Date('2026-09-02'),
    });
    expect(snap.skinAgeYears).toBe(22);
    expect(snap.chronologicalAgeYears).toBe(20);
    expect(snap.skinAgeDifference).toBe(2);
  });

  it('elige el mensaje según el signo de la diferencia', () => {
    expect(skinAgeDifferenceMessage(-4)).toContain('más joven');
    expect(skinAgeDifferenceMessage(0)).toContain('corresponde');
    expect(skinAgeDifferenceMessage(3)).toContain('envejecida');
  });

  it('lee skin_age desde el output de YouCam', () => {
    expect(
      readYoucamSkinAgeYears({
        output: [{ type: 'skin_age', score: 22 }],
      }),
    ).toBe(22);
  });
});
