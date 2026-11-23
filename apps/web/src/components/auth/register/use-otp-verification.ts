"use client";

import { useState } from "react";

type SendResult = { ok: boolean; error?: string };
type VerifyResult = { ok: boolean; ticket?: string; error?: string };

/**
 * Envío y verificación de un código (correo o celular) en los registros:
 * guarda el ticket y el valor que se verificó. Cambiar el valor después de
 * enviar el código obliga a verificar de nuevo (`reset`).
 */
export function useOtpVerification(
  value: string,
  send: (value: string) => Promise<SendResult>,
  verify: (value: string, code: string) => Promise<VerifyResult>,
) {
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [verifiedValue, setVerifiedValue] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  function reset() {
    setSent(false);
    setCode("");
    setTicket(null);
    setVerifiedValue(null);
    setError(null);
  }

  async function sendCode() {
    setError(null);
    setSending(true);
    const result = await send(value);
    setSending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo enviar el código.");
      return;
    }
    setSent(true);
  }

  async function verifyCode() {
    setError(null);
    setVerifying(true);
    const result = await verify(value, code);
    setVerifying(false);
    if (!result.ok || !result.ticket) {
      setError(result.error ?? "No se pudo verificar el código.");
      return;
    }
    setTicket(result.ticket);
    setVerifiedValue(value);
  }

  return { code, setCode, ticket, verifiedValue, sent, error, sending, verifying, reset, sendCode, verifyCode };
}

export type OtpVerification = ReturnType<typeof useOtpVerification>;
