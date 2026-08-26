import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DoctorReferidosView } from "./referidos-view";

/** Submódulo de Configuración: solo si Doctor.empresaReferida está activo. */
export default async function DoctorReferidosPage() {
  const session = await getSession();
  if (!session) redirect("/doctor/login");
  if (!session.empresaReferida) {
    redirect("/doctor/configuracion");
  }

  return <DoctorReferidosView />;
}
