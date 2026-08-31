import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import {
  DOCTOR_PANEL_ROLES,
  isClinicalPanelRole,
  isDoctorVerificationActive,
  type Role,
} from "@piel360/shared";
import { doctorRouteAllowed } from "@/lib/doctor-panel-permissions";
import { adminRouteAllowed } from "@/lib/admin-panel-permissions";

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
    "/doctor/empresa",
    "/doctor/login",
    "/doctor/login/empresa",
    "/doctor/register",
    "/doctor/register/empresa",
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

/** Rutas permitidas mientras el doctor no está active/approved. */
const DOCTOR_PENDING_ALLOWED_PREFIXES = [
  "/doctor/home",
  "/doctor/planes",
  "/doctor/facturacion",
  "/doctor/configuracion",
  "/doctor/mapas",
];

interface SessionPayload {
  role?: Role;
  permissions?: string[];
  surveyCompletedAt?: string | null;
  verificationStatus?: string;
}

function roleAllowedForPanel(panel: Panel, role: Role | undefined): boolean {
  if (!role) return false;
  if (panel === "admin") return role === "superadmin" || role === "monitor";
  if (panel === "doctor") {
    return (DOCTOR_PANEL_ROLES as readonly Role[]).includes(role);
  }
  return role === "patient";
}

/** Rutas del panel admin permitidas para el rol monitor (moderador). */
const MONITOR_ALLOWED_PREFIXES = ["/admin/verificacion"];

function monitorPathAllowed(pathname: string): boolean {
  return MONITOR_ALLOWED_PREFIXES.some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function doctorPathAllowedWhilePending(pathname: string): boolean {
  if (
    pathname.startsWith("/doctor/configuracion/equipos") ||
    pathname.startsWith("/doctor/configuracion/referidos")
  ) {
    return false;
  }
  return DOCTOR_PENDING_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function getFreshPermissions(
  token: string | undefined,
): Promise<string[] | undefined> {
  if (!token) return undefined;
  try {
    const apiUrl =
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3000/api";
    const res = await fetch(`${apiUrl}/auth/me/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { permissions?: string[] };
    return data.permissions;
  } catch {
    return undefined;
  }
}

async function getClinicalPanelPermissions(
  token: string | undefined,
  session: SessionPayload,
): Promise<string[] | undefined> {
  if (!isClinicalPanelRole(session.role) || !token) return session.permissions;
  return (await getFreshPermissions(token)) ?? session.permissions;
}

async function getSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
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

  const token = request.cookies.get("piel360_token")?.value;
  const session = await getSession(token);

  if (!session || !roleAllowedForPanel(panel, session.role)) {
    return NextResponse.redirect(new URL(`/${panel}/login`, request.url));
  }

  const clinicalPermissions =
    panel === "doctor" && isClinicalPanelRole(session.role)
      ? await getClinicalPanelPermissions(token, session)
      : session.permissions;

  const adminPermissions =
    panel === "admin" &&
    (session.role === "superadmin" || session.role === "monitor")
      ? ((await getFreshPermissions(token)) ?? session.permissions)
      : session.permissions;

  if (
    panel === "patient" &&
    !session.surveyCompletedAt &&
    !SURVEY_EXEMPT_PATHS.includes(pathname)
  ) {
    return NextResponse.redirect(new URL("/patient/encuesta", request.url));
  }

  if (
    panel === "doctor" &&
    isClinicalPanelRole(session.role) &&
    !isDoctorVerificationActive(session.verificationStatus) &&
    !doctorPathAllowedWhilePending(pathname)
  ) {
    const dest = pathname.startsWith("/doctor/configuracion/")
      ? "/doctor/configuracion"
      : "/doctor/home";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (
    panel === "doctor" &&
    isClinicalPanelRole(session.role) &&
    isDoctorVerificationActive(session.verificationStatus) &&
    !doctorRouteAllowed(pathname, clinicalPermissions)
  ) {
    return NextResponse.redirect(new URL("/doctor/home", request.url));
  }

  if (
    panel === "admin" &&
    session.role === "monitor" &&
    !monitorPathAllowed(pathname) &&
    !adminRouteAllowed(pathname, adminPermissions)
  ) {
    return NextResponse.redirect(new URL("/admin/verificacion", request.url));
  }

  if (
    panel === "admin" &&
    session.role === "superadmin" &&
    !adminRouteAllowed(pathname, adminPermissions)
  ) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/doctor/:path*", "/patient/:path*", "/admin/:path*"],
};
