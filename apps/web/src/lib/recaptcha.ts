/**
 * reCAPTCHA Enterprise de **casilla de verificación** («No soy un robot») en
 * los inicios de sesión web: la clave del cliente es de casilla, no de
 * puntuación, así que el token sale cuando el usuario la marca. El API lo
 * verifica con CreateAssessment (`apps/api/src/auth/recaptcha.service.ts`).
 * Sin `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` no se carga nada y el login sigue sin
 * token, igual que antes.
 */
export const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";

/** `render=explicit`: la casilla se dibuja donde dice el formulario. */
export const RECAPTCHA_SCRIPT_URL = RECAPTCHA_SITE_KEY
  ? "https://www.google.com/recaptcha/enterprise.js?render=explicit&hl=es"
  : null;

type Grecaptcha = {
  enterprise: {
    ready: (callback: () => void) => void;
    render: (
      container: HTMLElement,
      options: {
        sitekey: string;
        action: string;
        callback: (token: string) => void;
        "expired-callback": () => void;
        "error-callback": () => void;
      },
    ) => number;
    reset: (widgetId: number) => void;
  };
};

function grecaptcha(): Grecaptcha | undefined {
  return (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
}

/** Dibuja la casilla en `container`. Devuelve el id del widget, o null si el
 * script todavía no está. `onToken(null)` = caducó o falló: hay que volver a
 * marcarla (cada token sirve una sola vez y dura 2 minutos). */
export function renderRecaptchaCheckbox(
  container: HTMLElement,
  action: string,
  onToken: (token: string | null) => void,
): Promise<number | null> {
  const api = grecaptcha()?.enterprise;
  if (!api) return Promise.resolve(null);
  return new Promise((resolve) =>
    api.ready(() =>
      resolve(
        api.render(container, {
          sitekey: RECAPTCHA_SITE_KEY,
          action,
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        }),
      ),
    ),
  );
}

export function resetRecaptcha(widgetId: number | null) {
  if (widgetId == null) return;
  try {
    grecaptcha()?.enterprise.reset(widgetId);
  } catch {
    // El widget ya no existe (la página cambió): no hay nada que reiniciar.
  }
}
