import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { RangosPuntuacionView } from "./rangos-puntuacion-view";

export default async function RangosPuntuacionPage() {
  const session = await getSession();
  if (!session) redirect("/doctor/login");
  if (session.organizationMemberRole === "member") {
    redirect("/doctor/configuracion");
  }

  return <RangosPuntuacionView />;
}
