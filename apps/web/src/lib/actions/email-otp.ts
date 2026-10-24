"use server";

import { ApiError, apiFetch } from "@/lib/api";

/** `register`: el correo no debe existir. `reset`: recuperar la contraseña. */
export type EmailOtpPurpose = "register" | "reset";

export interface SendEmailOtpResult {
  ok: boolean;
  error?: string;
}

export interface VerifyEmailOtpResult {
  ok: boolean;
  /** Lo devuelve `register`: el `emailTicket` del registro. */
  ticket?: string;
  /** Lo devuelve `reset`: el token de `reset-password`. */
  token?: string;
  error?: string;
}

export async function sendEmailOtpAction(
  email: string,
  purpose: EmailOtpPurpose = "register",
): Promise<SendEmailOtpResult> {
  try {
    await apiFetch("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), purpose }),
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: "No se pudo enviar el código." };
  }
}

export async function verifyEmailOtpAction(
  email: string,
  code: string,
  purpose: EmailOtpPurpose = "register",
): Promise<VerifyEmailOtpResult> {
  try {
    const result = await apiFetch<{ ok: true; ticket?: string; token?: string }>(
      "/auth/otp/verify",
      {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), purpose, code: code.trim() }),
      },
    );
    return { ok: true, ticket: result.ticket, token: result.token };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: "No se pudo verificar el código." };
  }
}
