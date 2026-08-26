import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DoctorEquipoView } from "./equipo-view";

/** Submódulo de Configuración: solo si Doctor.empresa está activo. */
export default async function DoctorEquipoPage() {
  const session = await getSession();
  if (!session) redirect("/doctor/login");
  if (!session.empresa) {
    redirect("/doctor/configuracion");
  }

  return <DoctorEquipoView />;
}
