"use server";

import { ApiError, apiFetch } from "@/lib/api";

export interface SendResetOtpResult {
  ok: boolean;
  error?: string;
}

export interface VerifyResetOtpResult {
  ok: boolean;
  token?: string;
  error?: string;
}

export interface ResetPasswordResult {
  ok: boolean;
  error?: string;
}

export async function sendPasswordResetOtpAction(
  email: string,
): Promise<SendResetOtpResult> {
  try {
    await apiFetch("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: "reset" }),
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: "No se pudo enviar el código." };
  }
}

export async function verifyPasswordResetOtpAction(
  email: string,
  code: string,
): Promise<VerifyResetOtpResult> {
  try {
    const result = await apiFetch<{ ok: true; token?: string }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        purpose: "reset",
        code: code.trim(),
      }),
    });
    if (!result.token) {
      return { ok: false, error: "No se pudo verificar el código." };
    }
    return { ok: true, token: result.token };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: "No se pudo verificar el código." };
  }
}

export async function resetPasswordAction(
  token: string,
  password: string,
): Promise<ResetPasswordResult> {
  try {
    await apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: "No se pudo restablecer la contraseña." };
  }
}
