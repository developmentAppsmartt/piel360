import Link from "next/link";
import { Star } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LoginPageShell } from "@/components/auth/login-page-shell";

export default function ModeradorLoginPage() {
  return (
    <LoginPageShell
      title="Soy Moderador"
      description="Revisa, modera y supervisa contenido y análisis dentro de la plataforma."
      icon={Star}
      accountPrompt={
        <span>
          ¿No tienes cuenta?{" "}
          <span className="font-medium text-primary">Contacta al administrador del sistema</span>
        </span>
      }
      footer={
        <Link href="/" className="text-sm text-slate-500 underline-offset-2 hover:text-primary hover:underline">
          Volver al inicio
        </Link>
      }
    >
      <LoginForm role="monitor" showForgotPassword={false} />
    </LoginPageShell>
  );
}
