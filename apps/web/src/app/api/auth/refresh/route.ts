import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError, apiFetch } from "@/lib/api";
import { clearSessionCookies, setSessionCookies } from "@/lib/session";

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Canjea la cookie httpOnly `piel360_refresh` por un access token nuevo.
 * Vive como Route Handler (no Server Action) porque `apiClientFetch` lo llama
 * desde el navegador con un `fetch` normal cuando una petición da 401 — ver
 * `lib/api-client.ts`. Next.js resuelve esta ruta literal antes que el
 * rewrite genérico `/api/:path*` de `next.config.ts`, así que no compite con
 * el proxy hacia el backend real.
 */
export async function POST() {
  const store = await cookies();
  const refreshToken = store.get("piel360_refresh")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No hay sesión" }, { status: 401 });
  }

  try {
    const result = await apiFetch<RefreshResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    await setSessionCookies(result.accessToken, result.refreshToken);
    return NextResponse.json({ ok: true });
  } catch (err) {
    await clearSessionCookies();
    const status = err instanceof ApiError ? err.status : 401;
    return NextResponse.json({ error: "Sesión expirada" }, { status: status || 401 });
  }
}
