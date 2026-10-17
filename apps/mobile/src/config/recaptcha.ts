/**
 * Claves públicas de reCAPTCHA v2 (checkbox).
 * El secreto vive solo en apps/api/.env (`RECAPTCHA_SECRET_KEY`).
 *
 * Mientras `EXPO_PUBLIC_RECAPTCHA_ENABLED` no sea `true`, el widget no se
 * muestra y el login no exige token (útil hasta tener claves de producción).
 */
export const RECAPTCHA_ENABLED =
  process.env.EXPO_PUBLIC_RECAPTCHA_ENABLED?.trim().toLowerCase() === 'true';

export const RECAPTCHA_SITE_KEY =
  process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? '';

/** Dominio registrado en la consola de reCAPTCHA (debe coincidir). */
export const RECAPTCHA_BASE_URL =
  process.env.EXPO_PUBLIC_RECAPTCHA_BASE_URL?.trim() || 'https://piel360.com';
