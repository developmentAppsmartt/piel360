import Link from "next/link";
import { UserRound } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LoginPageShell } from "@/components/auth/login-page-shell";

export default function DoctorLoginPage() {
  return (
    <LoginPageShell
      title="Soy Usuario"
      description="Accede a la plataforma para realizar análisis y gestionar pacientes."
      icon={UserRound}
      accountPrompt={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/doctor/register" className="font-medium text-primary underline-offset-2 hover:underline">
            Regístrate
          </Link>
        </>
      }
      footer={
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-500">
            ¿Representas una empresa?{" "}
            <Link href="/doctor/login/empresa" className="font-medium text-primary underline-offset-2 hover:underline">
              Inicio de sesión empresarial
            </Link>
          </p>
          <Link href="/" className="text-sm text-slate-500 underline-offset-2 hover:text-primary hover:underline">
            Volver al inicio
          </Link>
        </div>
      }
    >
      <LoginForm role="doctor" />
    </LoginPageShell>
  );
}
