"use client";

import { ApiError } from "./api-error";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

/**
 * Fetch desde el navegador contra la API NestJS. `credentials:"include"` envía
 * la cookie httpOnly `piel360_token` sola — el backend ya la acepta
 * (`apps/api/src/auth/jwt.strategy.ts`), no hace falta exponer el token a JS.
 */
export async function apiClientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData (multipart) necesita que el navegador fije su propio boundary —
  // si forzamos Content-Type:application/json aquí, el backend no puede parsear el body.
  const isFormData = init?.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
    credentials: "include",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.message ?? "Error inesperado", res.status);
  }

  return body as T;
}
