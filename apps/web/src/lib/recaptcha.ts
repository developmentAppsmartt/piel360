/**
 * reCAPTCHA de puntuación (invisible) en los inicios de sesión web. El API
 * verifica el token con CreateAssessment (`apps/api/src/auth/recaptcha.service.ts`).
 * Sin `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` no se carga nada y el login sigue sin
 * token, igual que antes.
 */
export const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";

export const RECAPTCHA_SCRIPT_URL = RECAPTCHA_SITE_KEY
  ? `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`
  : null;

type Grecaptcha = {
  enterprise: {
    ready: (callback: () => void) => void;
    execute: (siteKey: string, options: { action: string }) => Promise<string>;
  };
};

/** Token para `action` («login»), o `undefined` si reCAPTCHA no está
 * configurado o el script no cargó: el API decide si lo exige. */
export async function getRecaptchaToken(
  action: string,
): Promise<string | undefined> {
  if (!RECAPTCHA_SITE_KEY) return undefined;
  const grecaptcha = (window as unknown as { grecaptcha?: Grecaptcha })
    .grecaptcha;
  if (!grecaptcha?.enterprise) return undefined;
  try {
    await new Promise<void>((resolve) => grecaptcha.enterprise.ready(resolve));
    return await grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action });
  } catch {
    return undefined;
  }
}
