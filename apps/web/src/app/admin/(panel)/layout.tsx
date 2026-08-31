// Chrome del panel admin. Protección de rol (equivalente a EnsurePanelRole,
// MIGRACION.md §6) en src/proxy.ts, que intercepta /admin/(panel)/*.
// A diferencia de doctor/patient, admin no tiene landing pública: /admin ES
// el dashboard (solo accesible autenticado; si no, redirige a /admin/login).
import { redirect } from "next/navigation";
import { PanelShell } from "@/components/layout/panel-shell";
import { fetchUserPermissionsFromCookies } from "@/lib/server-auth-permissions";
import { getSession } from "@/lib/session";
import { adminNav } from "./nav-config";

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

  return (
    <PanelShell
      nav={adminNav}
      user={{ email: session.email, role: session.role, permissions }}
      notificationCount={isMonitor ? 0 : 12}
      sidebarUser={{
        name: isMonitor ? "Moderador" : "Super Admin",
        subtitle: isMonitor ? "Verificación de doctores" : "Acceso total",
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
