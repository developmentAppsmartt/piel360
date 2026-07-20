// Chrome del panel autenticado (sidebar/header): Semana 5 de PLAN-MIGRACION.md.
// La protección de rol (equivalente a EnsurePanelRole, MIGRACION.md §6) vive en
// src/proxy.ts, que intercepta /doctor/(panel)/* antes de llegar aquí.
import { redirect } from "next/navigation";
import { PanelShell } from "@/components/layout/panel-shell";
import { getSession } from "@/lib/session";
import { doctorNav } from "./nav-config";

export default async function DoctorPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/doctor/login");

  return (
    <PanelShell nav={doctorNav} user={{ email: session.email, role: session.role }}>
      {children}
    </PanelShell>
  );
}
