"use server";

import { ApiError, apiFetch } from "@/lib/api";

export interface SendPhoneOtpResult {
  ok: boolean;
  error?: string;
}

export interface VerifyPhoneOtpResult {
  ok: boolean;
  ticket?: string;
  error?: string;
}

export async function sendPhoneOtpAction(phone: string): Promise<SendPhoneOtpResult> {
  try {
    await apiFetch("/auth/otp/phone/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: "No se pudo enviar el código." };
  }
}

export async function verifyPhoneOtpAction(
  phone: string,
  code: string,
): Promise<VerifyPhoneOtpResult> {
  try {
    const result = await apiFetch<{ ok: true; ticket: string }>("/auth/otp/phone/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
    return { ok: true, ticket: result.ticket };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: "No se pudo verificar el código." };
  }
}
