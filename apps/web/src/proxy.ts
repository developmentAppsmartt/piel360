import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import {
  canAccessAdminPanel,
  canAccessClinicalPanel,
  canAccessPatientPanel,
  isClinicalPanelRole,
  isDoctorVerificationActive,
  teamPermissionAllowsNavHref,
  type PrimaryPanel,
  type Role,
  type TeamMemberPermission,
} from "@piel360/shared";
import { adminRouteAllowed } from "@/lib/admin-panel-permissions";
import { clinicalRouteAllowed } from "@/lib/clinical-panel-permissions";

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

const CLINICAL_PENDING_ALLOWED_PREFIXES = [
  "/doctor/home",
  "/doctor/planes",
  "/doctor/facturacion",
  "/doctor/configuracion",
  "/doctor/mapas",
];

interface SessionPayload {
  role?: Role;
  primaryPanel?: PrimaryPanel;
  roleSlugs?: string[];
  permissions?: string[];
  teamPermissions?: TeamMemberPermission[] | null;
  isOrgMember?: boolean;
  surveyCompletedAt?: string | null;
  verificationStatus?: string;
}

function panelAllowed(panel: Panel, session: SessionPayload): boolean {
  if (panel === "admin") {
    return canAccessAdminPanel(session.role, session.permissions);
  }
  if (panel === "doctor") {
    return canAccessClinicalPanel(session.role, session.permissions);
  }
  return canAccessPatientPanel(session.role, session.primaryPanel);
}

function isClinicalSession(session: SessionPayload): boolean {
  return (
    canAccessClinicalPanel(session.role, session.permissions) &&
    session.role !== "patient"
  );
}

const MONITOR_ALLOWED_PREFIXES = ["/admin/verificacion"];

function monitorPathAllowed(pathname: string): boolean {
  return MONITOR_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function clinicalPathAllowedWhilePending(pathname: string): boolean {
  if (
    pathname.startsWith("/doctor/configuracion/equipos") ||
    pathname.startsWith("/doctor/configuracion/referidos")
  ) {
    return false;
  }
  return CLINICAL_PENDING_ALLOWED_PREFIXES.some(
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

  if (!session || !panelAllowed(panel, session)) {
    return NextResponse.redirect(new URL(`/${panel}/login`, request.url));
  }

  const permissions =
    panel === "doctor" || panel === "admin"
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
    isClinicalSession(session) &&
    isClinicalPanelRole(session.role) &&
    session.verificationStatus &&
    !isDoctorVerificationActive(session.verificationStatus) &&
    !clinicalPathAllowedWhilePending(pathname)
  ) {
    const dest = pathname.startsWith("/doctor/configuracion/")
      ? "/doctor/configuracion"
      : "/doctor/home";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (
    panel === "doctor" &&
    isClinicalSession(session) &&
    (!session.verificationStatus ||
      isDoctorVerificationActive(session.verificationStatus)) &&
    !clinicalRouteAllowed(pathname, permissions)
  ) {
    return NextResponse.redirect(new URL("/doctor/home", request.url));
  }

  if (
    panel === "doctor" &&
    session.isOrgMember &&
    !teamPermissionAllowsNavHref(session.teamPermissions ?? undefined, pathname, {
      isOrgMember: true,
    })
  ) {
    return NextResponse.redirect(new URL("/doctor/home", request.url));
  }

  if (
    panel === "admin" &&
    !canAccessAdminPanel(session.role, permissions) &&
    canAccessClinicalPanel(session.role, permissions)
  ) {
    return NextResponse.redirect(new URL("/doctor/home", request.url));
  }

  if (panel === "admin") {
    if (
      session.role === "monitor" &&
      !monitorPathAllowed(pathname) &&
      !adminRouteAllowed(pathname, permissions)
    ) {
      return NextResponse.redirect(new URL("/admin/verificacion", request.url));
    }
    if (!adminRouteAllowed(pathname, permissions)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/doctor/:path*", "/patient/:path*", "/admin/:path*"],
};
