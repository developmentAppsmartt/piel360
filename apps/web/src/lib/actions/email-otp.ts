"use server";

import { ApiError, apiFetch } from "@/lib/api";

export interface SendEmailOtpResult {
  ok: boolean;
  error?: string;
}

export interface VerifyEmailOtpResult {
  ok: boolean;
  ticket?: string;
  error?: string;
}

export async function sendEmailOtpAction(email: string): Promise<SendEmailOtpResult> {
  try {
    await apiFetch("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ email, purpose: "register" }),
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
): Promise<VerifyEmailOtpResult> {
  try {
    const result = await apiFetch<{ ok: true; ticket: string }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, purpose: "register", code }),
    });
    return { ok: true, ticket: result.ticket };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: "No se pudo verificar el código." };
  }
}
