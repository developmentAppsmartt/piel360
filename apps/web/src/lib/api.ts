import { ApiError } from "./api-error";

const API_URL = process.env.API_URL ?? "http://localhost:3000/api";

export { ApiError };

/** Fetch server-to-server contra la API NestJS. Nunca se llama desde el navegador. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      // El backend usa X-Client para saber qué cupo de sesión ocupa el login
      // (1 web + 1 móvil para profesionales) — ver auth/session-policy.ts.
      "X-Client": "web",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.message ?? "Error inesperado", res.status, body?.code);
  }

  return body as T;
}
