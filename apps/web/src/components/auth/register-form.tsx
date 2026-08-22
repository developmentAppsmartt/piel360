"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { registerAction, type AuthActionState } from "@/lib/actions/auth";
import { sendPhoneOtpAction, verifyPhoneOtpAction } from "@/lib/actions/phone-otp";
import { TextField } from "./text-field";

const initialState: AuthActionState = {};

export function RegisterForm({
  role,
  loginHref,
}: {
  role: "doctor" | "patient";
  loginHref: string;
}) {
  const boundAction = registerAction.bind(null, role);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const phoneValid = /^\d{10,15}$/.test(phone);

  async function handleSendOtp() {
    setOtpError(null);
    setIsSendingOtp(true);
    const result = await sendPhoneOtpAction(phone);
    setIsSendingOtp(false);
    if (!result.ok) {
      setOtpError(result.error ?? "No se pudo enviar el código.");
      return;
    }
    setOtpSent(true);
  }

  async function handleVerifyOtp() {
    setOtpError(null);
    setIsVerifyingOtp(true);
    const result = await verifyPhoneOtpAction(phone, code);
    setIsVerifyingOtp(false);
    if (!result.ok || !result.ticket) {
      setOtpError(result.error ?? "No se pudo verificar el código.");
      return;
    }
    setTicket(result.ticket);
  }

  function resetPhoneVerification() {
    setOtpSent(false);
    setCode("");
    setTicket(null);
    setOtpError(null);
  }

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Nombre" id="firstName" name="firstName" required autoComplete="given-name" />
        <TextField label="Apellido" id="lastName" name="lastName" required autoComplete="family-name" />
      </div>
      <TextField label="Email" id="email" name="email" type="email" required autoComplete="email" />
      <TextField
        label="Contraseña"
        id="password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />

      <div className="space-y-2">
        <TextField
          label="Teléfono"
          id="phone"
          name="phone"
          type="tel"
          required
          disabled={ticket != null}
          autoComplete="tel"
          placeholder="Incluye el indicativo de país, ej: 573001234567"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (otpSent) resetPhoneVerification();
          }}
        />
        {ticket == null && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!phoneValid || isSendingOtp}
            onClick={handleSendOtp}
          >
            {isSendingOtp ? "Enviando..." : otpSent ? "Reenviar código" : "Enviar código"}
          </Button>
        )}

        {otpSent && ticket == null && (
          <div className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
            <p className="text-sm text-zinc-500">
              Te enviamos un código por SMS a {phone}.
            </p>
            <TextField
              label="Código de verificación"
              id="phoneOtpCode"
              name="phoneOtpCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              type="button"
              className="w-full"
              disabled={!code || isVerifyingOtp}
              onClick={handleVerifyOtp}
            >
              {isVerifyingOtp ? "Verificando..." : "Verificar"}
            </Button>
          </div>
        )}

        {ticket != null && (
          <p className="text-sm text-green-600">Teléfono verificado.</p>
        )}

        {otpError && <p className="text-sm text-red-600">{otpError}</p>}
      </div>

      <input type="hidden" name="phoneTicket" value={ticket ?? ""} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending || ticket == null} className="w-full">
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
      <p className="text-center text-sm text-zinc-500">
        ¿Ya tienes cuenta?{" "}
        <Link href={loginHref} className="underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
