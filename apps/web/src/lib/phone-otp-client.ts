"use client";

import { apiClientFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-error";

export async function sendPhoneOtpForProfile(
  phone: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiClientFetch("/auth/me/otp/phone/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: "No se pudo enviar el código." };
  }
}
