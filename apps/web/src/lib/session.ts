import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@piel360/shared";

export interface Session {
  sub: string;
  email: string;
  role: Role;
  surveyCompletedAt?: string | null;
}

const ACCESS_COOKIE = "piel360_token";
const REFRESH_COOKIE = "piel360_refresh";

/** Lee y verifica la sesión actual (mismo secreto/payload que src/proxy.ts). */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify<Session>(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookies(
  accessToken: string,
  refreshToken: string,
) {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";

  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // 15 min — igual al exp del access token (auth.service.ts)
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
