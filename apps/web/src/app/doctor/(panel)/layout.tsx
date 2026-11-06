// Chrome del panel autenticado (sidebar/header): Semana 5 de PLAN-MIGRACION.md.
// La protección de rol (equivalente a EnsurePanelRole, MIGRACION.md §6) vive en
// src/proxy.ts, que intercepta /doctor/(panel)/* antes de llegar aquí.
import { redirect } from "next/navigation";
import {
  isClinicalPanelRole,
  isDoctorVerificationActive,
  teamPermissionAllowsNavHref,
  toPublicProviderPermissions,
} from "@piel360/shared";
import { DepletedCreditsNotice } from "@/components/doctor/depleted-credits-notice";
import { NoActivePlanNotice } from "@/components/doctor/no-active-plan-notice";
import { PanelShell } from "@/components/layout/panel-shell";
import { clinicalRouteAllowed } from "@/lib/clinical-panel-permissions";
import { fetchSessionStateFromCookies } from "@/lib/server-auth-permissions";
import { getSession } from "@/lib/session";
import { buildUnifiedPanelNav } from "@/lib/unified-panel-nav";

/** Configuración elige sola el formulario: cuenta empresa o perfil profesional. */
const PROFILE_HREF = "/doctor/configuracion";

export default async function DoctorPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/doctor/login");

  const { permissions: freshPermissions, account } =
    await fetchSessionStateFromCookies();
  if (account?.disabled) redirect("/doctor/cuenta-deshabilitada");

  const permissions = toPublicProviderPermissions(
    freshPermissions ?? session.permissions ?? [],
  );

  const active = isDoctorVerificationActive(session.verificationStatus);
  const expiredPlans = account?.expiredPlans ?? [];
  const planRestricted = active && Boolean(account?.planRestricted);
  // Las mismas reglas con que el proxy deja entrar a la ruta: si el chip de la
  // cabecera enlazara sin permiso, el proxy lo devolvería al inicio. El
  // superadmin también entra a este panel, pero no tiene perfil profesional:
  // su Configuración solo dice que no pudo cargar la cuenta.
  const profileAllowed =
    isClinicalPanelRole(session.role) &&
    ((Boolean(session.verificationStatus) && !active) ||
      clinicalRouteAllowed(PROFILE_HREF, permissions));
  const teamAllowed =
    !session.isOrgMember ||
    teamPermissionAllowsNavHref(session.teamPermissions ?? undefined, PROFILE_HREF, {
      isOrgMember: true,
    });
  const retainsAccess = active && !planRestricted && expiredPlans.length > 0;
  const subtitle = !active
    ? "Verificación pendiente"
    : planRestricted
      ? "Sin plan activo"
      : session.empresaReferida
        ? "Empresa referida · Referidos"
        : session.empresa
          ? "Empresa · Equipo"
          : "Consulta individual";

  const navFeatures = {
    email: session.email,
    role: session.role,
    permissions,
    empresa: session.empresa,
    empresaReferida: session.empresaReferida,
    verificationStatus: session.verificationStatus,
    teamPermissions: session.teamPermissions,
    isOrgMember: session.isOrgMember,
    organizationMemberRole: session.organizationMemberRole,
    planRestricted,
  };

  return (
    <PanelShell
      nav={buildUnifiedPanelNav(navFeatures)}
      user={navFeatures}
      sidebarUser={{
        name: session.email,
        subtitle,
        enrichFromDoctorProfile: true,
      }}
      profileHref={profileAllowed && teamAllowed ? PROFILE_HREF : null}
      hideHeaderLogout
    >
      {!active ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tu cuenta está en verificación. Revisa el <strong>inicio</strong> para
          completar el registro y descargar la app. Mientras tanto puedes
          gestionar <strong>planes</strong>,{" "}
          <strong>compras y facturación</strong> y tu <strong>cuenta</strong>.
        </div>
      ) : null}
      {planRestricted || retainsAccess ? (
        <NoActivePlanNotice
          userId={session.sub}
          expiredPlans={expiredPlans}
          retainsAccess={retainsAccess}
        />
      ) : null}
      {active && !planRestricted && account?.depletedPlans?.length ? (
        <DepletedCreditsNotice
          userId={session.sub}
          depletedPlans={account.depletedPlans}
        />
      ) : null}
      {children}
    </PanelShell>
  );
}
