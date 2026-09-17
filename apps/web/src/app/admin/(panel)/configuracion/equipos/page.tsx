import { redirect } from "next/navigation";

export default function AdminEquiposRedirectPage() {
  redirect("/admin/configuracion/empresas");
}
