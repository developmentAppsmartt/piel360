"use server";

import { redirect } from "next/navigation";
import type { Role } from "@piel360/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { homeForUser } from "@/lib/auth-redirect";
import { clearSessionCookies, setSessionCookies } from "@/lib/session";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    verificationStatus?: string;
  };
}

export interface AuthActionState {
  error?: string;
}

/** Tras registro/login desde el cliente (fetch directo a la API). */
export async function establishSessionAction(
  accessToken: string,
  refreshToken: string,
) {
  await setSessionCookies(accessToken, refreshToken);
}

/** Se usa con .bind(null, role) desde cada <LoginForm role="..."> (MIGRACION.md §2.2). */
export async function loginAction(
  _role: Role,
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  let result: AuthResponse;
  try {
    result = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: "No se pudo conectar con el servidor." };
  }

  await setSessionCookies(result.accessToken, result.refreshToken);

  if (_role === "empresa" && result.user.role !== "empresa") {
    await clearSessionCookies();
    return {
      error:
        "Esta cuenta no es empresarial. Usa el inicio de sesión profesional.",
    };
  }
  if (_role === "doctor" && result.user.role === "empresa") {
    await clearSessionCookies();
    return {
      error:
        "Esta cuenta es empresarial. Usa el inicio de sesión para empresas.",
    };
  }

  redirect(homeForUser(result.user));
}

/** Admin no tiene auto-registro (MIGRACION.md §2.2) — solo doctor/patient. */
export async function registerAction(
  role: "doctor" | "patient",
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "");
  const lastName = String(formData.get("lastName") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const phoneTicket = String(formData.get("phoneTicket") ?? "");
  const membershipType = String(formData.get("membershipType") ?? "solo_doctor");

  const body: Record<string, string> = {
    email,
    password,
    firstName,
    lastName,
    phone,
    phoneTicket,
  };
  if (role === "doctor") {
    body.membershipType = membershipType;
  }

  let result: AuthResponse;
  try {
    result = await apiFetch<AuthResponse>(`/auth/register/${role}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: "No se pudo conectar con el servidor." };
  }

  await setSessionCookies(result.accessToken, result.refreshToken);
  redirect(homeForUser(result.user));
}

export async function logoutAction() {
  await clearSessionCookies();
  redirect("/");
}

/**
 * Canjea el código de un solo uso del callback de Google OAuth
 * (`/auth/google/callback?code=…`) por cookies de sesión.
 */
export async function exchangeGoogleCodeAction(
  code: string,
  expectedRole?: "doctor" | "patient",
): Promise<AuthActionState> {
  if (!code.trim()) {
    return { error: "Falta el código de Google." };
  }

  let result: AuthResponse;
  try {
    result = await apiFetch<AuthResponse>("/auth/google/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: "No se pudo completar el inicio con Google." };
  }

  await setSessionCookies(result.accessToken, result.refreshToken);

  if (expectedRole === "doctor" && result.user.role === "empresa") {
    await clearSessionCookies();
    return {
      error:
        "Esta cuenta es empresarial. Usa el inicio de sesión para empresas.",
    };
  }
  if (expectedRole === "patient" && result.user.role !== "patient") {
    await clearSessionCookies();
    return {
      error:
        "Esta cuenta no es de paciente. Usa el inicio de sesión correspondiente.",
    };
  }
  if (expectedRole === "doctor" && result.user.role === "patient") {
    await clearSessionCookies();
    return {
      error:
        "Esta cuenta de Google ya está registrada como paciente. Usa el acceso de paciente o contacta soporte.",
    };
  }

  redirect(homeForUser(result.user));
}
