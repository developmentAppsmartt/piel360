import Link from "next/link";
import { Building2 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LoginPageShell } from "@/components/auth/login-page-shell";

export default function EmpresaLoginPage() {
  return (
    <LoginPageShell
      title="Soy Empresa"
      description="Accede al panel de tu organización, equipo y planes empresariales."
      icon={Building2}
      accountPrompt={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/doctor/register/empresa" className="font-medium text-primary underline-offset-2 hover:underline">
            Regístrate
          </Link>
        </>
      }
      footer={
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            ¿Eres profesional individual?{" "}
            <Link href="/doctor/login" className="font-medium text-primary underline-offset-2 hover:underline">
              Inicio de sesión profesional
            </Link>
          </p>
          <Link href="/" className="text-sm text-slate-500 underline-offset-2 hover:text-primary hover:underline">
            Volver al inicio
          </Link>
        </div>
      }
    >
      <LoginForm role="empresa" />
    </LoginPageShell>
  );
}
