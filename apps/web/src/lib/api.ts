import { ApiError } from "./api-error";

const API_URL = process.env.API_URL ?? "http://localhost:3000/api";

export { ApiError };

/** Fetch server-to-server contra la API NestJS. Nunca se llama desde el navegador. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.message ?? "Error inesperado", res.status);
  }

  return body as T;
}
