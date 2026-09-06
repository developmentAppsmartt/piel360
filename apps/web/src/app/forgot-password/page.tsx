import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LoginPageShell } from "@/components/auth/login-page-shell";

export default function ForgotPasswordPage() {
  return (
    <LoginPageShell
      title="Recuperar contraseña"
      description="Te enviaremos un código de verificación a tu correo para que puedas crear una nueva contraseña."
      icon={KeyRound}
      footer={
        <Link href="/" className="text-sm text-slate-500 underline-offset-2 hover:text-primary hover:underline">
          Volver al inicio
        </Link>
      }
    >
      <ForgotPasswordForm />
    </LoginPageShell>
  );
}
