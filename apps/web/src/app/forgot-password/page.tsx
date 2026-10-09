"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import {
  ForgotPasswordForm,
  type ForgotPasswordStep,
} from "@/components/auth/forgot-password-form";
import { LoginPageShell } from "@/components/auth/login-page-shell";

export default function ForgotPasswordPage() {
  // El paso vive acá y no dentro del formulario porque la descripción de la
  // maqueta habla del código que se envía: deja de ser cierta en cuanto se
  // está escribiendo la nueva contraseña.
  const [step, setStep] = useState<ForgotPasswordStep>("email");

  return (
    <LoginPageShell
      title="Recuperar contraseña"
      description={
        step === "email" || step === "otp"
          ? "Te enviaremos un código de verificación a tu correo para que puedas crear una nueva contraseña."
          : undefined
      }
      icon={KeyRound}
      footer={
        <Link href="/" className="text-sm text-slate-500 underline-offset-2 hover:text-primary hover:underline">
          Volver al inicio
        </Link>
      }
    >
      <ForgotPasswordForm step={step} onStepChange={setStep} />
    </LoginPageShell>
  );
}
