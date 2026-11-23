"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isStrongPassword, PASSWORD_STRENGTH_MESSAGE } from "@piel360/shared";
import { PasswordRequirements } from "@/components/ui/password-requirements";
import { LocationPickerSection, useLocationPicker } from "@/components/auth/location-picker-section";
import { doctorDocuments } from "@/lib/doctor-documents";
import {
  combinePhoneParts,
  digitsOnly,
  Field,
  inputClass,
  isValidE164Digits,
  PhoneSplitInputs,
  splitFullName,
} from "@/components/auth/auth-form-primitives";
import { establishSessionAction, type AuthActionState } from "@/lib/actions/auth";
import { sendEmailOtpAction, verifyEmailOtpAction } from "@/lib/actions/email-otp";
import { sendPhoneOtpAction, verifyPhoneOtpAction } from "@/lib/actions/phone-otp";
import { homeForUser } from "@/lib/auth-redirect";
import { ApiError } from "@/lib/api-error";
import { registerDoctorWithDocuments } from "@/lib/doctor-register-client";
import { GoogleContinueButton } from "@/components/auth/google-continue-button";
import {
  LegalAcceptanceChecks,
  NO_LEGAL_CHECKS,
  legalChecksComplete,
  type LegalChecks,
} from "@/components/legal/legal-acceptance-checks";
import { AlliedReferralNotice } from "./register/allied-referral-notice";
import { DocUploadCard } from "./register/doc-upload-card";
import {
  DoctorProfessionalFields,
  EMPTY_PROFESSIONAL,
  professionalError,
  professionalPayload,
  type ProfessionalValues,
} from "./register/doctor-professional-fields";
import { OtpVerifyControls } from "./register/otp-verify-controls";
import { useAlliedReferral } from "./register/use-allied-referral";
import { useOtpVerification } from "./register/use-otp-verification";

const DOC_TYPES = ["CC", "CE", "TI", "PA"] as const;

const GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
] as const;

export function DoctorRegisterForm({ referralCode: initialReferralCode }: { referralCode?: string } = {}) {
  const router = useRouter();
  const locationPicker = useLocationPicker();
  const allied = useAlliedReferral(initialReferralCode);
  const [state, setState] = useState<AuthActionState>({});
  const [isPending, setIsPending] = useState(false);

  const empresaRegisterHref = allied.code
    ? `/doctor/register/empresa?ref=${encodeURIComponent(allied.code)}`
    : "/doctor/register/empresa";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState("57");
  const [phoneNational, setPhoneNational] = useState("");
  const [docType, setDocType] = useState<string>(DOC_TYPES[0]);
  const [docNumber, setDocNumber] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [professional, setProfessional] = useState<ProfessionalValues>(EMPTY_PROFESSIONAL);
  /** Archivos por clave del FormData — las tarjetas salen de doctorDocuments(). */
  const [documents, setDocuments] = useState<Record<string, File | null>>({});
  const [legal, setLegal] = useState<LegalChecks>(NO_LEGAL_CHECKS);

  const phone = combinePhoneParts(phonePrefix, phoneNational);
  const phoneValid =
    digitsOnly(phonePrefix).length >= 1 && digitsOnly(phoneNational).length >= 7 && isValidE164Digits(phone);
  const phoneOtp = useOtpVerification(phone, sendPhoneOtpAction, verifyPhoneOtpAction);
  const emailOtp = useOtpVerification(email.trim(), sendEmailOtpAction, verifyEmailOtpAction);

  /** El primer dato que falta o está mal, o null si se puede enviar. */
  function validationError(): string | null {
    if (!phoneValid) return "Celular inválido — revisa el prefijo (ej. 57) y el número (10 a 15 dígitos en total).";
    if (!phoneOtp.ticket) return "Verifica tu celular antes de continuar.";
    if (!emailOtp.ticket) return "Verifica tu correo antes de continuar.";
    if (!locationPicker.location) return "Busca o marca la ubicación exacta de tu consulta.";
    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName || !lastName) return "Ingresa tu nombre completo.";
    if (!docNumber.trim()) return "Ingresa el número de documento.";
    if (!isStrongPassword(password)) return PASSWORD_STRENGTH_MESSAGE;
    if (password !== confirmPassword) return "Las contraseñas no coinciden.";
    const professionalProblem = professionalError(professional);
    if (professionalProblem) return professionalProblem;
    if (!legalChecksComplete(legal)) return "Debes aceptar los Términos y Condiciones y la Política de Tratamiento de Datos.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validationError();
    setState(problem ? { error: problem } : {});
    if (problem || !locationPicker.location) return;

    const { firstName, lastName } = splitFullName(fullName);
    setIsPending(true);
    try {
      const { result, docUploadError } = await registerDoctorWithDocuments(
        {
          email: email.trim(),
          password,
          firstName,
          lastName,
          phone: phoneOtp.verifiedValue ?? phone,
          phoneTicket: phoneOtp.ticket ?? undefined,
          emailTicket: emailOtp.ticket ?? undefined,
          membershipType: "solo_doctor",
          address: locationPicker.address || locationPicker.addressQuery,
          country: locationPicker.country.trim() || undefined,
          lat: locationPicker.location.lat,
          lng: locationPicker.location.lng,
          docType: docType || undefined,
          docNumber: docNumber.trim() || undefined,
          gender: gender || undefined,
          birthDate: birthDate || undefined,
          ...professionalPayload(professional),
          referralCode: allied.referral?.code,
          acceptTerms: true,
          acceptPrivacy: true,
        },
        documents,
      );

      await establishSessionAction(result.accessToken, result.refreshToken);
      if (docUploadError) {
        setState({ error: docUploadError });
        setIsPending(false);
        return;
      }
      router.push(homeForUser(result.user));
    } catch (err) {
      setIsPending(false);
      setState({ error: err instanceof ApiError ? err.message : "No se pudo conectar con el servidor." });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm sm:p-8"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Registro de Profesionales</h1>
        <p className="text-sm text-zinc-500">
          Para especialistas médicos y técnicos laborales. Si representas una empresa, usa el{" "}
          <Link href={empresaRegisterHref} className="text-sky-600 underline">
            registro empresarial
          </Link>
          .
        </p>
      </div>

      <AlliedReferralNotice loading={allied.loading} error={allied.error} referral={allied.referral} />

      <GoogleContinueButton role="doctor" label="Registrarme con Google" />
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs text-zinc-400">o completa el formulario</span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" required>
          <input
            className={inputClass}
            placeholder="Ana María Gómez"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
        </Field>
        <Field label="Correo profesional" required>
          <div className="space-y-2">
            <input
              className={inputClass}
              type="email"
              placeholder="ana@clinica.com"
              value={email}
              disabled={emailOtp.ticket != null}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailOtp.sent) emailOtp.reset();
              }}
              required
              autoComplete="email"
            />
            <OtpVerifyControls
              otp={emailOtp}
              canSend={Boolean(email.trim())}
              sentTo={`a ${email}`}
              verifiedLabel="Correo verificado."
            />
          </div>
        </Field>
        <Field label="Celular" required>
          <div className="space-y-2">
            <PhoneSplitInputs
              prefix={phonePrefix}
              nationalNumber={phoneNational}
              disabled={phoneOtp.ticket != null}
              onPrefixChange={(value) => {
                setPhonePrefix(value);
                if (phoneOtp.sent) phoneOtp.reset();
              }}
              onNationalChange={(value) => {
                setPhoneNational(value);
                if (phoneOtp.sent) phoneOtp.reset();
              }}
            />
            <OtpVerifyControls
              otp={phoneOtp}
              canSend={phoneValid}
              sentTo={`por SMS a +${phone}`}
              verifiedLabel="Teléfono verificado."
            />
          </div>
        </Field>
        <Field label="Tipo de documento" required>
          <select className={inputClass} value={docType} onChange={(e) => setDocType(e.target.value)} required>
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Número de documento" required>
          <input
            className={inputClass}
            placeholder="1234567890"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            required
            autoComplete="off"
          />
        </Field>
        <Field label="Género" required>
          <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)} required>
            <option value="">Seleccionar</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha de nacimiento" required>
          <input
            className={inputClass}
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            required
          />
        </Field>
        <Field label="Contraseña" required>
          <div className="relative">
            <input
              className={inputClass}
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="Crea una contraseña segura"
            />
            {passwordFocused && password ? <PasswordRequirements password={password} /> : null}
          </div>
        </Field>
        <Field label="Confirmar contraseña" required>
          <input
            className={inputClass}
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite la contraseña"
          />
        </Field>
        <DoctorProfessionalFields value={professional} onChange={setProfessional} />
      </div>

      <LocationPickerSection picker={locationPicker} />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Subida de documentos</h2>
          <p className="text-xs text-zinc-500">Opcional. Puedes cargarlos más adelante al completar tu registro.</p>
        </div>
        {/* Los documentos dependen del tipo de profesional: mostrarlos antes de
            elegirlo pediría los equivocados. */}
        {professional.kind ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {doctorDocuments(professional.kind).map((doc) => (
              <DocUploadCard
                key={doc.field}
                title={doc.label}
                file={documents[doc.field] ?? null}
                onChange={(file) => setDocuments((prev) => ({ ...prev, [doc.field]: file }))}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center text-sm text-zinc-500">
            Elige el tipo de profesional para ver los documentos que debes adjuntar.
          </p>
        )}
      </section>

      <LegalAcceptanceChecks value={legal} onChange={setLegal} disabled={isPending} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={
          isPending || phoneOtp.ticket == null || allied.loading || allied.pending || !legalChecksComplete(legal)
        }
        className="h-12 w-full rounded-xl bg-sky-500 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-40 sm:w-auto sm:px-10"
      >
        {isPending ? "Creando cuenta…" : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/doctor/login" className="text-sky-600 underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
