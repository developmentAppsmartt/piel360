"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Field, inputClass } from "@/components/auth/auth-form-primitives";
import {
  resetPasswordAction,
  sendPasswordResetOtpAction,
  verifyPasswordResetOtpAction,
} from "@/lib/actions/forgot-password";

type Step = "email" | "otp" | "password" | "done";

const buttonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5b4fd4] via-[#1e5a9e] to-[#3b82c4] text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSendCode() {
    setError(null);
    if (!email.trim()) {
      setError("Ingresa tu correo electrónico.");
      return;
    }
    setIsPending(true);
    const result = await sendPasswordResetOtpAction(email);
    setIsPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo enviar el código.");
      return;
    }
    setStep("otp");
  }

  async function handleVerifyCode() {
    setError(null);
    if (code.trim().length !== 5) {
      setError("El código tiene 5 dígitos.");
      return;
    }
    setIsPending(true);
    const result = await verifyPasswordResetOtpAction(email, code);
    setIsPending(false);
    if (!result.ok || !result.token) {
      setError(result.error ?? "No se pudo verificar el código.");
      return;
    }
    setResetToken(result.token);
    setStep("password");
  }

  async function handleResetPassword() {
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setIsPending(true);
    const result = await resetPasswordAction(resetToken, password);
    setIsPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo restablecer la contraseña.");
      return;
    }
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-zinc-700">
          Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con
          tu nueva contraseña.
        </p>
        <Link href="/" className={buttonClass}>
          Ir al inicio
        </Link>
      </div>
    );
  }

  if (step === "password") {
    return (
      <div className="space-y-4">
        <Field label="Nueva contraseña" required>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />
        </Field>
        <Field label="Confirmar contraseña" required>
          <input
            type="password"
            className={inputClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            placeholder="Repite la contraseña"
          />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={isPending}
          onClick={() => void handleResetPassword()}
          className={buttonClass}
        >
          {isPending ? "Guardando..." : "Guardar contraseña"}
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">
          Te enviamos un código de 5 dígitos a <strong>{email}</strong>.
        </p>
        <Field label="Código de verificación" required>
          <input
            className={inputClass}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="00000"
          />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={isPending}
          onClick={() => void handleVerifyCode()}
          className={buttonClass}
        >
          {isPending ? "Verificando..." : "Verificar código"}
          <ArrowRight className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => void handleSendCode()}
          className="w-full text-center text-sm text-primary underline-offset-2 hover:underline disabled:opacity-60"
        >
          Reenviar código
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Correo electrónico" required>
        <input
          type="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="tu@email.com"
        />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => void handleSendCode()}
        className={buttonClass}
      >
        {isPending ? "Enviando..." : "Enviar código"}
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
