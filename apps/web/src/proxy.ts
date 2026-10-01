import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import {
  canAccessAdminPanel,
  canAccessClinicalPanel,
  canAccessPatientPanel,
  clinicalPathAllowedWithoutPlan,
  isClinicalPanelRole,
  isDoctorVerificationActive,
  SESSION_REPLACED,
  teamPermissionAllowsNavHref,
  type AccountStatus,
  type PrimaryPanel,
  type Role,
  type TeamMemberPermission,
} from "@piel360/shared";
import { adminRouteAllowed } from "@/lib/admin-panel-permissions";
import { clinicalRouteAllowed } from "@/lib/clinical-panel-permissions";
import { SESSION_REPLACED_REASON } from "@/lib/login-path";

const PANELS = ["doctor", "patient", "admin"] as const;
type Panel = (typeof PANELS)[number];

/** Unica ruta de paciente que queda viva en web: explica que se entra por la app. */
const PATIENT_APP_PATH = "/patient";

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
  // Inalcanzable mientras exista la guarda de `panel === "patient"` en
  // proxy(); se conserva para poder reabrir el panel quitando solo esa guarda.
  patient: [
    "/patient",
    "/patient/login",
    "/patient/register",
    "/patient/password-reset/request",
    "/patient/password-reset/reset",
  ],
  admin: ["/admin/login"],
};

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

/** `sessionEnded` marca que el backend ya no reconoce la sesión (la cerró
 * otro login): el token sigue siendo válido por firma, así que es la única
 * forma de detectarlo en el proxy. */
async function getFreshPermissions(
  token: string | undefined,
): Promise<{
  permissions?: string[];
  sessionEnded?: boolean;
  account?: AccountStatus;
}> {
  if (!token) return {};
  try {
    const apiUrl =
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3000/api";
    const res = await fetch(`${apiUrl}/auth/me/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 401) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      return { sessionEnded: body?.code === SESSION_REPLACED };
    }
    if (!res.ok) return {};
    const data = (await res.json()) as {
      permissions?: string[];
      account?: AccountStatus;
    };
    return { permissions: data.permissions, account: data.account };
  } catch {
    return {};
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

  // Los pacientes usan solo la app: /patient/* deja de ser navegable en web
  // —login, registro y panel— y todo cae en la pagina que explica como entrar
  // desde el movil. Va antes de PUBLIC_PATHS para que tambien cierre
  // /patient/login y /patient/register. Quitar este bloque reabre el panel tal
  // y como estaba.
  if (panel === "patient") {
    return pathname === PATIENT_APP_PATH
      ? NextResponse.next()
      : NextResponse.redirect(new URL(PATIENT_APP_PATH, request.url));
  }

  if (PUBLIC_PATHS[panel].includes(pathname)) return NextResponse.next();

  const token = request.cookies.get("piel360_token")?.value;
  const session = await getSession(token);

  if (!session || !panelAllowed(panel, session)) {
    return NextResponse.redirect(new URL(`/${panel}/login`, request.url));
  }

  // Se consulta en los tres paneles (no solo doctor/admin): es la única
  // forma de enterarse de que otro login cerró esta sesión, porque el token
  // sigue siendo válido por firma. Sin esto, una pantalla que no consulta
  // nada al API (p. ej. la encuesta del paciente) seguía navegable.
  const fresh = await getFreshPermissions(token);
  if (fresh.sessionEnded) {
    const url = new URL(`/${panel}/login`, request.url);
    url.searchParams.set("reason", SESSION_REPLACED_REASON);
    const response = NextResponse.redirect(url);
    response.cookies.delete("piel360_token");
    response.cookies.delete("piel360_refresh");
    return response;
  }
  const permissions =
    panel === "doctor" || panel === "admin"
      ? (fresh.permissions ?? session.permissions)
      : session.permissions;

  // Aquí vivía el gate de encuesta obligatoria del paciente. Con el panel
  // cerrado `panel` ya no puede valer "patient" y TypeScript rechaza la
  // comparación, así que se retira en vez de silenciarla con un cast: al
  // reabrir el panel hay que restaurarlo (redirigía a /patient/encuesta
  // mientras `session.surveyCompletedAt` estuviera vacío).

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
