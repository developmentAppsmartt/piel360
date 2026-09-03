import Link from "next/link";
import { UserRound } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LoginPageShell } from "@/components/auth/login-page-shell";

export default function PatientLoginPage() {
  return (
    <LoginPageShell
      title="Soy Paciente"
      description="Consulta tus análisis y resultados dermatológicos."
      icon={UserRound}
      accountPrompt={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/patient/register" className="font-medium text-primary underline-offset-2 hover:underline">
            Regístrate
          </Link>
        </>
      }
      footer={
        <Link href="/" className="text-sm text-slate-500 underline-offset-2 hover:text-primary hover:underline">
          Volver al inicio
        </Link>
      }
    >
      <LoginForm role="patient" />
    </LoginPageShell>
  );
}
