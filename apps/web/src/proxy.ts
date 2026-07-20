import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import type { Role } from "@piel360/shared";

/**
 * Protección de rutas por rol (equivalente a `EnsurePanelRole`) y gate de
 * encuesta obligatoria del paciente (equivalente a `EnsurePatientSurveyCompleted`).
 * Ver MIGRACION.md §6. El token lo emite `POST /api/auth/login` (Semana 2 del
 * backend); aquí solo se verifica la firma y se lee el payload.
 *
 * Nota: en Next.js 16 este archivo se llama `proxy.ts` (antes `middleware.ts`,
 * convención deprecada desde v16 — ver next.js/docs file-conventions/proxy).
 *
 * Nota: (panel) es un route group de Next.js — no aparece en la URL — por eso
 * las rutas del panel autenticado comparten el mismo prefijo `/doctor/*` que
 * la landing/login públicos. La protección se hace por lista de excepciones,
 * no por segmento de carpeta.
 */

const PANELS = ["doctor", "patient", "admin"] as const;
type Panel = (typeof PANELS)[number];

const PUBLIC_PATHS: Record<Panel, string[]> = {
  doctor: [
    "/doctor",
    "/doctor/login",
    "/doctor/register",
    "/doctor/password-reset/request",
    "/doctor/password-reset/reset",
  ],
  patient: [
    "/patient",
    "/patient/login",
    "/patient/register",
    "/patient/password-reset/request",
    "/patient/password-reset/reset",
  ],
  admin: ["/admin/login"],
};

const SURVEY_EXEMPT_PATHS = ["/patient/encuesta"];

interface SessionPayload {
  role?: Role;
  surveyCompletedAt?: string | null;
}

async function getSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify<SessionPayload>(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const panel = PANELS.find(
    (p) => pathname === `/${p}` || pathname.startsWith(`/${p}/`),
  );
  if (!panel) return NextResponse.next();

  if (PUBLIC_PATHS[panel].includes(pathname)) return NextResponse.next();

  const session = await getSession(request.cookies.get("piel360_token")?.value);

  if (!session || session.role !== panel) {
    return NextResponse.redirect(new URL(`/${panel}/login`, request.url));
  }

  if (
    panel === "patient" &&
    !session.surveyCompletedAt &&
    !SURVEY_EXEMPT_PATHS.includes(pathname)
  ) {
    return NextResponse.redirect(new URL("/patient/encuesta", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/doctor/:path*", "/patient/:path*", "/admin/:path*"],
};
