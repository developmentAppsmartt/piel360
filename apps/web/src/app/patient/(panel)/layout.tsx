// Chrome del panel autenticado. La protección de rol y el gate de encuesta
// obligatoria (equivalente a EnsurePatientSurveyCompleted, MIGRACION.md §6)
// viven en src/proxy.ts, que intercepta /patient/(panel)/* antes de esto.
import { redirect } from "next/navigation";
import { PanelShell } from "@/components/layout/panel-shell";
import { getSession } from "@/lib/session";
import { patientNav } from "./nav-config";

export default async function PatientPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/patient/login");

  return (
    <PanelShell nav={patientNav} user={{ email: session.email, role: session.role }}>
      {children}
    </PanelShell>
  );
}
