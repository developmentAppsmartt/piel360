import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LoginPageShell } from "@/components/auth/login-page-shell";

export default function AdminLoginPage() {
  return (
    <LoginPageShell
      title="Soy Administrador"
      description="Gestiona usuarios, planes, configuraciones y permisos de la plataforma."
      icon={ShieldCheck}
      accountPrompt={
        <span>
          ¿No tienes cuenta?{" "}
          <span className="font-medium text-primary">Solicita acceso con tu administrador</span>
        </span>
      }
      footer={
        <Link href="/" className="text-sm text-slate-500 underline-offset-2 hover:text-primary hover:underline">
          Volver al inicio
        </Link>
      }
    >
      <LoginForm role="superadmin" showForgotPassword={false} />
    </LoginPageShell>
  );
}
