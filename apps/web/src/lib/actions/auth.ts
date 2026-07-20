"use server";

import { redirect } from "next/navigation";
import type { Role } from "@piel360/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { clearSessionCookies, setSessionCookies } from "@/lib/session";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: Role };
}

export interface AuthActionState {
  error?: string;
}

const PANEL_HOME: Record<Role, string> = {
  admin: "/admin",
  doctor: "/doctor/home",
  patient: "/patient/dashboard",
};

/** Se usa con .bind(null, role) desde cada <LoginForm role="..."> (MIGRACION.md §2.2). */
export async function loginAction(
  role: Role,
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

  if (result.user.role !== role) {
    return {
      error: "Esta cuenta no corresponde a este panel. Verifica el rol con el que te registraste.",
    };
  }

  await setSessionCookies(result.accessToken, result.refreshToken);
  redirect(PANEL_HOME[role]);
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

  let result: AuthResponse;
  try {
    result = await apiFetch<AuthResponse>(`/auth/register/${role}`, {
      method: "POST",
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: "No se pudo conectar con el servidor." };
  }

  await setSessionCookies(result.accessToken, result.refreshToken);
  redirect(PANEL_HOME[role]);
}

export async function logoutAction() {
  await clearSessionCookies();
  redirect("/");
}
