// Chrome del panel autenticado (sidebar/header): Semana 5 de PLAN-MIGRACION.md.
// La protección de rol (equivalente a EnsurePanelRole, MIGRACION.md §6) vive en
// src/proxy.ts, que intercepta /doctor/(panel)/* antes de llegar aquí.
import { redirect } from "next/navigation";
import { isDoctorVerificationActive } from "@piel360/shared";
import { PanelShell } from "@/components/layout/panel-shell";
import { fetchUserPermissionsFromCookies } from "@/lib/server-auth-permissions";
import { getSession } from "@/lib/session";
import { buildUnifiedPanelNav } from "@/lib/unified-panel-nav";

export default async function DoctorPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/doctor/login");

  const freshPermissions = await fetchUserPermissionsFromCookies();
  const permissions = freshPermissions ?? session.permissions ?? [];

  const active = isDoctorVerificationActive(session.verificationStatus);
  const subtitle = !active
    ? "Verificación pendiente"
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
      {children}
    </PanelShell>
  );
}
