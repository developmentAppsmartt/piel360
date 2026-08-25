"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";

export type CreateModeratorState = {
  error?: string;
};

const ACCESS_COOKIE = "piel360_token";

export async function createModeratorAction(
  _prev: CreateModeratorState,
  formData: FormData,
): Promise<CreateModeratorState> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) {
    return { error: "Sesión expirada. Vuelve a iniciar sesión." };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const docType = String(formData.get("docType") ?? "").trim();
  const docNumber = String(formData.get("docNumber") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "");
  const phone = phoneRaw.replace(/\D/g, "");

  if (!firstName || !lastName || !email || password.length < 8) {
    return {
      error: "Completa nombre, apellidos, correo y contraseña (mín. 8).",
    };
  }

  try {
    await apiFetch("/admin/moderators", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        docType: docType || undefined,
        docNumber: docNumber || undefined,
        phone: phone || undefined,
      }),
    });
  } catch (err) {
    if (err instanceof ApiError) {
      const msg = Array.isArray(err.message)
        ? err.message.join(", ")
        : err.message;
      return { error: msg || "No se pudo crear el moderador." };
    }
    return { error: "No se pudo conectar con el servidor." };
  }

  redirect("/admin/moderadores");
}
