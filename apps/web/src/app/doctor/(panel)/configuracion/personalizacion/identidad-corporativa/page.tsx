import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { IdentidadCorporativaView } from "./identidad-corporativa-view";

export default async function IdentidadCorporativaPage() {
  const session = await getSession();
  if (!session) redirect("/doctor/login");
  if (session.organizationMemberRole === "member") {
    redirect("/doctor/configuracion");
  }

  return <IdentidadCorporativaView />;
}
