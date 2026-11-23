"use client";

import { inputClass } from "@/components/auth/auth-form-primitives";
import type { OtpVerification } from "./use-otp-verification";

/** Botón «Enviar código», campo del código, «Verificar» y el estado, debajo
 * del correo o del celular en los registros. */
export function OtpVerifyControls({
  otp,
  canSend,
  sentTo,
  verifiedLabel,
}: {
  otp: OtpVerification;
  canSend: boolean;
  /** «a ana@correo.com» o «por SMS a +57…». */
  sentTo: string;
  verifiedLabel: string;
}) {
  if (otp.ticket != null) {
    return (
      <>
        <p className="text-xs text-green-600">{verifiedLabel}</p>
        {otp.error ? <p className="text-xs text-red-600">{otp.error}</p> : null}
      </>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled={!canSend || otp.sending}
        onClick={() => void otp.sendCode()}
        className="h-9 w-full rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
      >
        {otp.sending ? "Enviando…" : otp.sent ? "Reenviar código" : "Enviar código"}
      </button>
      {otp.sent ? (
        <div className="space-y-2 rounded-lg border border-zinc-200 p-2.5">
          <p className="text-xs text-zinc-500">Te enviamos un código {sentTo}.</p>
          <input
            className={inputClass}
            placeholder="Código de verificación"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp.code}
            onChange={(e) => otp.setCode(e.target.value)}
          />
          <button
            type="button"
            disabled={!otp.code || otp.verifying}
            onClick={() => void otp.verifyCode()}
            className="h-9 w-full rounded-lg bg-sky-500 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-40"
          >
            {otp.verifying ? "Verificando…" : "Verificar"}
          </button>
        </div>
      ) : null}
      {otp.error ? <p className="text-xs text-red-600">{otp.error}</p> : null}
    </>
  );
}
