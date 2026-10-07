import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PersonalizacionView } from "./personalizacion-view";

/** Submódulo de Configuración: solo el dueño de la cuenta, nunca un miembro invitado. */
export default async function PersonalizacionPage() {
  const session = await getSession();
  if (!session) redirect("/doctor/login");
  if (session.organizationMemberRole === "member") {
    redirect("/doctor/configuracion");
  }

  return <PersonalizacionView />;
}
