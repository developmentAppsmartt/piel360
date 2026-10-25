"use client";

import { useState } from "react";
import { PasswordVisibilityToggle } from "@/components/auth/auth-form-primitives";
import { PasswordRequirements } from "@/components/ui/password-requirements";

/** Piezas compartidas por los dos diálogos de «Acceso y seguridad». */

export const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500 disabled:bg-muted";

/** El código del OTP es de 5 dígitos en todo el producto (registro, reset y
 * SMS) — ver `randomInt(10000, 100000)` en auth.service.ts. */
export const LARGO_CODIGO = 5;

export function Aviso({ error, ok }: { error: string | null; ok: string | null }) {
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (ok) return <p className="text-sm text-emerald-700">{ok}</p>;
  return null;
}

export function CampoCodigo({
  value,
  onChange,
  onResend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onResend: () => void;
  disabled: boolean;
}) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Código de verificación</span>
        <input
          className={inputClass}
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, LARGO_CODIGO))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="00000"
        />
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={onResend}
        className="text-sm text-primary underline-offset-2 hover:underline disabled:opacity-60"
      >
        Reenviar código
      </button>
    </>
  );
}

/** Nueva contraseña + confirmación. Lo comparten los tres métodos: una vez se
 * probó la identidad, el token es el mismo. */
export function CamposPasswordNueva({
  password,
  onPassword,
  confirmacion,
  onConfirmacion,
}: {
  password: string;
  onPassword: (v: string) => void;
  confirmacion: string;
  onConfirmacion: (v: string) => void;
}) {
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);
  const [enfocado, setEnfocado] = useState(false);

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Nueva contraseña</span>
        <div className="relative">
          <input
            type={verPassword ? "text" : "password"}
            className={`${inputClass} pr-11`}
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
            autoComplete="new-password"
            placeholder="Crea una contraseña segura"
          />
          <PasswordVisibilityToggle
            visible={verPassword}
            onToggle={() => setVerPassword((v) => !v)}
          />
          {enfocado && password ? (
            <PasswordRequirements password={password} />
          ) : null}
        </div>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Confirmar contraseña</span>
        <div className="relative">
          <input
            type={verConfirmacion ? "text" : "password"}
            className={`${inputClass} pr-11`}
            value={confirmacion}
            onChange={(e) => onConfirmacion(e.target.value)}
            autoComplete="new-password"
            placeholder="Repite la contraseña"
          />
          <PasswordVisibilityToggle
            visible={verConfirmacion}
            onToggle={() => setVerConfirmacion((v) => !v)}
          />
        </div>
      </label>
    </>
  );
}
