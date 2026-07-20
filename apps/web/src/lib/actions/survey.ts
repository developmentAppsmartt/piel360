"use server";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@piel360/shared";

const ACCESS_COOKIE = "piel360_token";

interface SessionClaims {
  sub: string;
  email: string;
  role: Role;
  surveyCompletedAt?: string | null;
}

/**
 * Tras `POST /me/survey`, `surveyCompletedAt` queda desactualizado en el JWT
 * ya emitido (proxy.ts solo lee el claim del token, no la DB) — sin esto,
 * el gate de encuesta obligatoria redirige en bucle a /patient/encuesta
 * incluso después de completarla. Reemite el mismo access token (mismo
 * secreto HS256 que apps/api/src/auth/auth.module.ts) con el claim al día,
 * sin necesitar un endpoint de refresh en el backend.
 */
export async function refreshSurveySession() {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token || !process.env.JWT_SECRET) return;

  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  try {
    const { payload } = await jwtVerify<SessionClaims>(token, secret);

    const newToken = await new SignJWT({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      surveyCompletedAt: new Date().toISOString(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secret);

    store.set(ACCESS_COOKIE, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });
  } catch {
    // Token inválido/expirado — el próximo login normal lo resuelve.
  }
}
