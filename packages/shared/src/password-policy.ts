/** Política de contraseña para registro / reset de pacientes. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * ≥8 caracteres, al menos una letra, un dígito y un símbolo.
 */
export const PASSWORD_STRENGTH_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;

export const PASSWORD_STRENGTH_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, incluir letras, números y un símbolo.';

export const PASSWORD_STRENGTH_HINT =
  'Mínimo 8 caracteres, con letras, números y un símbolo';

export function isStrongPassword(password: string): boolean {
  return PASSWORD_STRENGTH_REGEX.test(password);
}
