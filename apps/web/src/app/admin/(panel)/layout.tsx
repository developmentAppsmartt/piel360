// Chrome del panel admin. Protección de rol (equivalente a EnsurePanelRole,
// MIGRACION.md §6) en src/proxy.ts, que intercepta /admin/(panel)/*.
// A diferencia de doctor/patient, admin no tiene landing pública: /admin ES
// el dashboard (solo accesible autenticado; si no, redirige a /admin/login).
import { redirect } from "next/navigation";
import { PanelShell } from "@/components/layout/panel-shell";
import { getSession } from "@/lib/session";
import { adminNav } from "./nav-config";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <PanelShell nav={adminNav} user={{ email: session.email, role: session.role }}>
      {children}
    </PanelShell>
  );
}
