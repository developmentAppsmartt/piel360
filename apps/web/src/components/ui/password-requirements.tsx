import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@piel360/shared";
import { cn } from "@/lib/utils";

/** Mismas reglas que PASSWORD_STRENGTH_REGEX en @piel360/shared, desglosadas
 * para poder mostrar cada requisito por separado. */
export function getPasswordChecks(password: string) {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    alphanumeric: /[A-Za-z]/.test(password) && /\d/.test(password),
    symbol: /[^A-Za-z0-9\s]/.test(password),
  };
}

function Requirement({ met, title, hint }: { met: boolean; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-2.5">
      {met ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
      ) : (
        <Circle className="mt-0.5 size-5 shrink-0 text-zinc-300" />
      )}
      <div>
        <p className={cn("text-sm font-medium", met ? "text-emerald-700" : "text-zinc-700")}>
          {title}
        </p>
        <p className="text-xs text-zinc-500">{hint}</p>
      </div>
    </div>
  );
}

/**
 * Checklist visual de requisitos de contraseña, reutilizado en todos los
 * formularios que piden crear/cambiar contraseña.
 *
 * Se posiciona en `absolute` para flotar sobre el contenido en vez de
 * empujarlo hacia abajo — el contenedor que lo envuelve debe tener
 * `position: relative` (ver usos en doctor-register-form/patient-form/
 * forgot-password-form).
 */
export function PasswordRequirements({
  password,
  footer = "Una contraseña segura protege tu información.",
  className,
}: {
  password: string;
  footer?: string;
  className?: string;
}) {
  const checks = getPasswordChecks(password);

  return (
    <div
      className={cn(
        // z-[1300]: por encima de cualquier otro elemento del formulario
        // (ej. el buscador de dirección en location-picker-section.tsx usa
        // hasta z-[1200] para su lista de sugerencias) — mientras está
        // enfocado debe verse completo y sin que nada lo tape.
        "absolute left-0 top-full z-1300 mt-2 w-full space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
          <ShieldCheck className="size-4.5" />
        </span>
        <p className="text-sm font-semibold text-zinc-900">Requisitos de la contraseña</p>
      </div>

      <div className="space-y-2.5 border-t border-zinc-100 pt-3">
        <Requirement
          met={checks.length}
          title={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
          hint={`Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres en total.`}
        />
        <div className="border-t border-zinc-100" />
        <Requirement
          met={checks.alphanumeric}
          title="Alfanuméricos"
          hint="Debe incluir letras y números."
        />
        <div className="border-t border-zinc-100" />
        <Requirement
          met={checks.symbol}
          title="Un símbolo"
          hint="Debe incluir al menos un símbolo (ej: ! @ # $ % & *)."
        />
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-xs text-sky-800">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sky-500" />
        <span>{footer}</span>
      </div>
    </div>
  );
}
