import { getSession } from "@/lib/session";
import { DoctorProfileForm } from "./doctor-profile-form";
import { EmpresaAccountForm } from "./empresa-account-form";

export default async function ConfiguracionPage() {
  const session = await getSession();
  const isEmpresa = Boolean(session?.empresa || session?.role === "empresa");

  if (isEmpresa) {
    return <EmpresaAccountForm />;
  }

  return <DoctorProfileForm />;
}
