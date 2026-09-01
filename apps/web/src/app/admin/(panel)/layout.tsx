// Chrome del panel admin. Protección de rol (equivalente a EnsurePanelRole,
// MIGRACION.md §6) en src/proxy.ts, que intercepta /admin/(panel)/*.
import { redirect } from "next/navigation";
import { PanelShell } from "@/components/layout/panel-shell";
import { fetchUserPermissionsFromCookies } from "@/lib/server-auth-permissions";
import { getSession } from "@/lib/session";
import { buildUnifiedPanelNav } from "@/lib/unified-panel-nav";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const isMonitor = session.role === "monitor";
  const freshPermissions = await fetchUserPermissionsFromCookies();
  const permissions = freshPermissions ?? session.permissions ?? [];

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

  const unifiedNav = buildUnifiedPanelNav(navFeatures);

  return (
    <PanelShell
      nav={unifiedNav}
      user={navFeatures}
      notificationCount={isMonitor ? 0 : 12}
      sidebarUser={{
        name: session.email,
        subtitle: isMonitor ? "Verificación de doctores" : session.email,
        enrichFromDoctorProfile: session.role === "empresa" || session.role === "doctor",
        monitorHint: isMonitor
          ? "Validar profesionales mantiene la confianza de la plataforma."
          : undefined,
      }}
      hideHeaderLogout
    >
      {children}
    </PanelShell>
  );
}
