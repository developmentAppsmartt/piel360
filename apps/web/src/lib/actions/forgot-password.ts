"use server";

import { ApiError, apiFetch } from "@/lib/api";

export interface ResetPasswordResult {
  ok: boolean;
  error?: string;
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
