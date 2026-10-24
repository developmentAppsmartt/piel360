"use client";

import { apiClientFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-error";

/** Mismo contrato que `phone-otp-client.ts`: nunca lanza, devuelve el mensaje
 * del API para pintarlo en el diálogo. */
export interface SecurityResult {
  ok: boolean;
  error?: string;
}

export interface TokenResult extends SecurityResult {
  /** Token de un solo uso que consume `cambiarPassword`. */
  token?: string;
}

function fallo(err: unknown, porDefecto: string): SecurityResult {
  if (err instanceof ApiError) return { ok: false, error: err.message };
  return { ok: false, error: porDefecto };
}

// ---------------------------------------------------------------- contraseña

/** Camino por defecto: probar la identidad con la contraseña actual. */
export async function verificarPasswordActual(
  currentPassword: string,
): Promise<TokenResult> {
  try {
    const result = await apiClientFetch<{ ok: true; token: string }>(
      "/auth/me/password/verify",
      { method: "POST", body: JSON.stringify({ currentPassword }) },
    );
    return { ok: true, token: result.token };
  } catch (err) {
    return fallo(err, "No se pudo verificar la contraseña.");
  }
}

/** Alternativa para quien no la recuerda: código al correo o al celular. */
export async function enviarCodigoCambioPassword(
  channel: "email" | "phone",
  phone?: string,
): Promise<SecurityResult> {
  try {
    await apiClientFetch("/auth/me/password/otp/send", {
      method: "POST",
      body: JSON.stringify({
        channel,
        ...(channel === "phone" && phone ? { phone } : {}),
      }),
    });
    return { ok: true };
  } catch (err) {
    return fallo(err, "No se pudo enviar el código.");
  }
}

export async function verificarCodigoCambioPassword(
  channel: "email" | "phone",
  code: string,
  phone?: string,
): Promise<TokenResult> {
  try {
    const result = await apiClientFetch<{ ok: true; token: string }>(
      "/auth/me/password/otp/verify",
      {
        method: "POST",
        body: JSON.stringify({
          channel,
          code: code.trim(),
          ...(channel === "phone" && phone ? { phone } : {}),
        }),
      },
    );
    if (!result.token) {
      return { ok: false, error: "No se pudo verificar el código." };
    }
    return { ok: true, token: result.token };
  } catch (err) {
    return fallo(err, "No se pudo verificar el código.");
  }
}

/** Escribe la contraseña nueva — el mismo endpoint para los tres caminos. */
export async function cambiarPassword(
  token: string,
  password: string,
): Promise<SecurityResult> {
  try {
    await apiClientFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    return { ok: true };
  } catch (err) {
    return fallo(err, "No se pudo cambiar la contraseña.");
  }
}

// -------------------------------------------------------------------- correo

/** El código va al correo NUEVO. `purpose: "register"` es el único que
 * rechaza un correo ya registrado, que es justo la validación que hace falta. */
export async function enviarCodigoCorreoNuevo(
  email: string,
): Promise<SecurityResult> {
  try {
    await apiClientFetch("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        purpose: "register",
      }),
    });
    return { ok: true };
  } catch (err) {
    return fallo(err, "No se pudo enviar el código.");
  }
}

export async function cambiarCorreo(
  email: string,
  code: string,
): Promise<SecurityResult> {
  const normalizado = email.trim().toLowerCase();
  try {
    const verificado = await apiClientFetch<{ ok: true; ticket?: string }>(
      "/auth/otp/verify",
      {
        method: "POST",
        body: JSON.stringify({
          email: normalizado,
          purpose: "register",
          code: code.trim(),
        }),
      },
    );
    if (!verificado.ticket) {
      return { ok: false, error: "No se pudo verificar el código." };
    }

    await apiClientFetch("/auth/me/email/confirm", {
      method: "POST",
      body: JSON.stringify({
        email: normalizado,
        emailTicket: verificado.ticket,
      }),
    });
    return { ok: true };
  } catch (err) {
    return fallo(err, "No se pudo cambiar el correo.");
  }
}
