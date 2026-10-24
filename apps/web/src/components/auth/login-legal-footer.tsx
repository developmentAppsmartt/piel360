const linkClass = "text-primary underline-offset-2 hover:underline";

/** Pie de los inicios de sesión. El aviso de reCAPTCHA es el texto que Google
 * exige cuando se oculta su insignia (`.grecaptcha-badge` en globals.css). */
export function LoginLegalFooter() {
  return (
    <div className="space-y-1.5 text-center text-xs leading-relaxed text-slate-400">
      <p>
        Este sitio web está protegido por reCAPTCHA y se aplican la{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Política de Privacidad
        </a>{" "}
        y los{" "}
        <a
          href="https://policies.google.com/terms"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Términos de Servicio
        </a>{" "}
        de Google.
      </p>
      {/* El login es estático: el año del build puede no ser el del
          navegador, y ahí manda el del navegador. */}
      <p suppressHydrationWarning>
        {new Date().getFullYear()} © Piel 360. Todos los Derechos Reservados.
      </p>
    </div>
  );
}
