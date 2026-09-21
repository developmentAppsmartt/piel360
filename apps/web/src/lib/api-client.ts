"use client";

import { SESSION_REPLACED } from "@piel360/shared";
import { ApiError } from "./api-error";
import { loginPathForCurrentPanel } from "./login-path";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

/** Evita que varias queries que fallan casi al mismo tiempo (React Query)
 * disparen cada una su propio refresh — todas esperan la misma promesa. */
let refreshInFlight: Promise<boolean> | null = null;

/** POST same-origin a nuestro propio Next (no al backend) — es el único que
 * puede reescribir las cookies httpOnly de sesión. Ver app/api/auth/refresh/route.ts. */
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (res.ok) return true;
        // Sesión cerrada desde otro dispositivo: no tiene sentido dejar al
        // usuario en una pantalla que va a fallar en cada query — se manda
        // al login con el motivo para mostrarle el aviso.
        const body = await res.json().catch(() => null);
        if (body?.code === SESSION_REPLACED) {
          window.location.href = `${loginPathForCurrentPanel(
            window.location.pathname,
          )}?reason=session_replaced`;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function doFetch(path: string, init?: RequestInit): Promise<Response> {
  const isFormData = init?.body instanceof FormData;
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
    credentials: "include",
  });
}

/**
 * Fetch desde el navegador contra la API NestJS. `credentials:"include"` envía
 * la cookie httpOnly `piel360_token` sola — el backend ya la acepta
 * (`apps/api/src/auth/jwt.strategy.ts`), no hace falta exponer el token a JS.
 *
 * Si el access token venció (401), intenta renovarlo una vez vía
 * `piel360_refresh` (cookie de 7 días — ver auth.service.ts#refreshTokens) y
 * reintenta la petición original antes de darla por fallida.
 */
export async function apiClientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await doFetch(path, init);

  // /auth/* nunca dispara refresh: un 401 ahí es login inválido, no sesión vencida.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await doFetch(path, init);
    }
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const raw = body?.message;
    const message = Array.isArray(raw)
      ? raw.join(". ")
      : typeof raw === "string"
        ? raw
        : "Error inesperado";
    throw new ApiError(message, res.status, body?.code);
  }

  return body as T;
}
