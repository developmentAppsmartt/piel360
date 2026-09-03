"use client";

import { useEffect, useState } from "react";
import {
  combinePhoneParts,
  digitsOnly,
  isValidE164Digits,
  PhoneSplitInputs,
} from "@/components/auth/auth-form-primitives";

type OtpActionResult = { ok: boolean; error?: string };
type VerifyOtpResult = { ok: boolean; ticket?: string; error?: string };

export function PhoneOtpField({
  phonePrefix,
  phoneNational,
  onPrefixChange,
  onNationalChange,
  originalPhoneDigits = "",
  phoneTicket,
  onPhoneTicketChange,
  sendOtp,
  verifyOtp,
  inputClass,
  showSubLabels = false,
}: {
  phonePrefix: string;
  phoneNational: string;
  onPrefixChange: (value: string) => void;
  onNationalChange: (value: string) => void;
  originalPhoneDigits?: string;
  phoneTicket: string | null;
  onPhoneTicketChange: (ticket: string | null) => void;
  sendOtp: (phone: string) => Promise<OtpActionResult>;
  verifyOtp: (phone: string, code: string) => Promise<VerifyOtpResult>;
  inputClass: string;
  showSubLabels?: boolean;
}) {
  const phone = combinePhoneParts(phonePrefix, phoneNational);
  const phoneValid =
    digitsOnly(phonePrefix).length >= 1 &&
    digitsOnly(phoneNational).length >= 7 &&
    isValidE164Digits(phone);
  const phoneChanged = phone !== originalPhoneDigits;
  const requiresOtp = phoneChanged && phoneValid;

  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  function resetOtpFlow() {
    setOtpSent(false);
    setOtpCode("");
    setOtpError(null);
    onPhoneTicketChange(null);
  }

  useEffect(() => {
    if (!phoneChanged) {
      resetOtpFlow();
    }
  }, [phoneChanged]);

  async function handleSendOtp() {
    setOtpError(null);
    setIsSendingOtp(true);
    const result = await sendOtp(phone);
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
    const result = await verifyOtp(phone, otpCode);
    setIsVerifyingOtp(false);
    if (!result.ok || !result.ticket) {
      setOtpError(result.error ?? "No se pudo verificar el código.");
      return;
    }
    onPhoneTicketChange(result.ticket);
  }

  return (
    <div className="space-y-2">
      <PhoneSplitInputs
        prefix={phonePrefix}
        nationalNumber={phoneNational}
        disabled={requiresOtp && phoneTicket != null}
        inputClass={inputClass}
        showSubLabels={showSubLabels}
        onPrefixChange={(value) => {
          onPrefixChange(value);
          if (otpSent) resetOtpFlow();
        }}
        onNationalChange={(value) => {
          onNationalChange(value);
          if (otpSent) resetOtpFlow();
        }}
      />
      {!requiresOtp && originalPhoneDigits && phoneValid ? (
        <p className="text-xs text-muted-foreground">
          Celular actual sin cambios — no hace falta verificar de nuevo.
        </p>
      ) : null}
      {requiresOtp && phoneTicket == null ? (
        <button
          type="button"
          disabled={!phoneValid || isSendingOtp}
          onClick={handleSendOtp}
          className="h-9 w-full rounded-md border border-input bg-background text-sm font-medium hover:bg-muted/50 disabled:opacity-40"
        >
          {isSendingOtp
            ? "Enviando…"
            : otpSent
              ? "Reenviar código"
              : "Enviar código SMS"}
        </button>
      ) : null}
      {requiresOtp && otpSent && phoneTicket == null ? (
        <div className="space-y-2 rounded-lg border border-border p-2.5">
          <p className="text-xs text-muted-foreground">
            Te enviamos un código por SMS a +{phone}.
          </p>
          <input
            className={inputClass}
            placeholder="Código de verificación"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
          />
          <button
            type="button"
            disabled={!otpCode || isVerifyingOtp}
            onClick={handleVerifyOtp}
            className="h-9 w-full rounded-md bg-sky-500 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-40"
          >
            {isVerifyingOtp ? "Verificando…" : "Verificar celular"}
          </button>
        </div>
      ) : null}
      {requiresOtp && phoneTicket != null ? (
        <p className="text-xs text-emerald-700">Celular verificado.</p>
      ) : null}
      {otpError ? <p className="text-xs text-destructive">{otpError}</p> : null}
    </div>
  );
}
