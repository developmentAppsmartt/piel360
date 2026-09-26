"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudUpload } from "lucide-react";
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
import {
  establishSessionAction,
  type AuthActionState,
} from "@/lib/actions/auth";
import { sendEmailOtpAction, verifyEmailOtpAction } from "@/lib/actions/email-otp";
import { CatalogCombobox } from "@/components/auth/catalog-combobox";
import { sendPhoneOtpAction, verifyPhoneOtpAction } from "@/lib/actions/phone-otp";
import { homeForUser } from "@/lib/auth-redirect";
import { ApiError } from "@/lib/api-error";
import { apiClientFetch } from "@/lib/api-client";
import { registerDoctorWithDocuments } from "@/lib/doctor-register-client";
import { useLaborTechnicianProfiles } from "@/lib/queries/labor-technician-profiles";
import { useSpecialties } from "@/lib/queries/specialties";
import { GoogleContinueButton } from "@/components/auth/google-continue-button";

const DOC_TYPES = ["CC", "CE", "TI", "PA"] as const;

const GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
] as const;

function DocUploadCard({
  title,
  file,
  onChange,
}: {
  title: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-5 text-center transition hover:border-sky-400">
      <CloudUpload className="size-7 text-sky-500" />
      <span className="text-sm font-semibold text-zinc-900">{title}</span>
      <span className="text-xs text-zinc-500">
        {file ? file.name : "PDF, JPG o PNG · opcional"}
      </span>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          onChange(e.target.files?.[0] ?? null);
        }}
      />
    </label>
  );
}

export function DoctorRegisterForm({
  referralCode: initialReferralCode,
}: {
  referralCode?: string;
} = {}) {
  const router = useRouter();
  const locationPicker = useLocationPicker();
  const specialtiesQuery = useSpecialties();
  const laborProfilesQuery = useLaborTechnicianProfiles();
  const specialties = specialtiesQuery.data?.map((item) => item.name) ?? [];
  const laborProfiles = laborProfilesQuery.data?.map((item) => item.name) ?? [];
  const [state, setState] = useState<AuthActionState>({});
  const [isPending, setIsPending] = useState(false);
  const [alliedReferral, setAlliedReferral] = useState<{
    code: string;
    organizationName: string;
  } | null>(null);
  const [referralLoading, setReferralLoading] = useState(
    Boolean(initialReferralCode?.trim()),
  );
  const [referralError, setReferralError] = useState<string | null>(null);

  const empresaRegisterHref = (() => {
    const code = alliedReferral?.code || initialReferralCode?.trim();
    return code
      ? `/doctor/register/empresa?ref=${encodeURIComponent(code)}`
      : "/doctor/register/empresa";
  })();

  useEffect(() => {
    const code = initialReferralCode?.trim();
    if (!code) {
      setReferralLoading(false);
      return;
    }

    let cancelled = false;
    setReferralLoading(true);
    setReferralError(null);

    void apiClientFetch<{
      code: string;
      organizationName: string;
    }>(`/auth/referral/${encodeURIComponent(code)}`)
      .then((data) => {
        if (cancelled) return;
        setAlliedReferral({
          code: data.code,
          organizationName: data.organizationName,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setReferralError(
          err instanceof ApiError
            ? err.message
            : "Código de empresa aliada no válido.",
        );
      })
      .finally(() => {
        if (!cancelled) setReferralLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialReferralCode]);

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
  const [professionalKind, setProfessionalKind] = useState<"specialty" | "labor" | "">("");
  const [specialty, setSpecialty] = useState("");
  const [laborProfile, setLaborProfile] = useState("");
  const [medicalRegistry, setMedicalRegistry] = useState("");
  const [educationEntity, setEducationEntity] = useState("");
  const [graduationInstitution, setGraduationInstitution] = useState("");
  const [technicalInstitution, setTechnicalInstitution] = useState("");
  /** Archivos por clave del FormData — las tarjetas salen de doctorDocuments(). */
  const [documents, setDocuments] = useState<Record<string, File | null>>({});

  const phone = combinePhoneParts(phonePrefix, phoneNational);
  const phoneValid =
    digitsOnly(phonePrefix).length >= 1 &&
    digitsOnly(phoneNational).length >= 7 &&
    isValidE164Digits(phone);

  const [otpCode, setOtpCode] = useState("");
  const [phoneTicket, setPhoneTicket] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailTicket, setEmailTicket] = useState<string | null>(null);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);

  function resetPhoneVerification() {
    setOtpSent(false);
    setOtpCode("");
    setPhoneTicket(null);
    setVerifiedPhone(null);
    setOtpError(null);
  }

  function resetEmailVerification() {
    setEmailOtpSent(false);
    setEmailOtpCode("");
    setEmailTicket(null);
    setEmailOtpError(null);
  }

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
    const result = await verifyPhoneOtpAction(phone, otpCode);
    setIsVerifyingOtp(false);
    if (!result.ok || !result.ticket) {
      setOtpError(result.error ?? "No se pudo verificar el código.");
      return;
    }
    setPhoneTicket(result.ticket);
    setVerifiedPhone(phone);
  }

  async function handleSendEmailOtp() {
    setEmailOtpError(null);
    setIsSendingEmailOtp(true);
    const result = await sendEmailOtpAction(email.trim());
    setIsSendingEmailOtp(false);
    if (!result.ok) {
      setEmailOtpError(result.error ?? "No se pudo enviar el código.");
      return;
    }
    setEmailOtpSent(true);
  }

  async function handleVerifyEmailOtp() {
    setEmailOtpError(null);
    setIsVerifyingEmailOtp(true);
    const result = await verifyEmailOtpAction(email.trim(), emailOtpCode);
    setIsVerifyingEmailOtp(false);
    if (!result.ok || !result.ticket) {
      setEmailOtpError(result.error ?? "No se pudo verificar el código.");
      return;
    }
    setEmailTicket(result.ticket);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({});
    if (!phoneValid) {
      setState({
        error:
          "Celular inválido — revisa el prefijo (ej. 57) y el número (10 a 15 dígitos en total).",
      });
      return;
    }
    if (!phoneTicket) {
      setState({ error: "Verifica tu celular antes de continuar." });
      return;
    }
    if (!emailTicket) {
      setState({ error: "Verifica tu correo antes de continuar." });
      return;
    }
    if (!locationPicker.location) {
      setState({
        error: "Busca o marca la ubicación exacta de tu consulta.",
      });
      return;
    }

    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName || !lastName) {
      setState({ error: "Ingresa tu nombre completo." });
      return;
    }
    if (!docNumber.trim()) {
      setState({ error: "Ingresa el número de documento." });
      return;
    }
    if (!isStrongPassword(password)) {
      setState({ error: PASSWORD_STRENGTH_MESSAGE });
      return;
    }
    if (password !== confirmPassword) {
      setState({ error: "Las contraseñas no coinciden." });
      return;
    }
    if (!professionalKind) {
      setState({ error: "Elige si eres especialista médico o técnico laboral." });
      return;
    }
    if (professionalKind === "specialty") {
      if (!specialty.trim()) {
        setState({ error: "Selecciona una especialidad médica." });
        return;
      }
      if (!medicalRegistry.trim()) {
        setState({ error: "Ingresa tu registro médico." });
        return;
      }
      if (!educationEntity.trim()) {
        setState({ error: "Indica la entidad educativa de pregrado." });
        return;
      }
      // El postgrado es opcional: un médico general no tiene especialización.
    }
    if (professionalKind === "labor") {
      if (!laborProfile.trim()) {
        setState({ error: "Selecciona un perfil de técnico laboral." });
        return;
      }
      if (!technicalInstitution.trim()) {
        setState({ error: "Indica la institución educativa técnica." });
        return;
      }
    }

    const resolvedSpecialty =
      professionalKind === "labor" ? laborProfile.trim() : specialty.trim();

    const phoneForRegister = verifiedPhone ?? phone;

    setIsPending(true);
    try {
      const { result, docUploadError } = await registerDoctorWithDocuments(
        {
          email: email.trim(),
          password,
          firstName,
          lastName,
          phone: phoneForRegister,
          phoneTicket: phoneTicket ?? undefined,
          emailTicket: emailTicket ?? undefined,
          membershipType: "solo_doctor",
          specialty: resolvedSpecialty,
          address: locationPicker.address || locationPicker.addressQuery,
          country: "CO",
          lat: locationPicker.location.lat,
          lng: locationPicker.location.lng,
          docType: docType || undefined,
          docNumber: docNumber.trim() || undefined,
          gender: gender || undefined,
          birthDate: birthDate || undefined,
          professionalKind,
          // Solo se manda lo que corresponde al tipo elegido: así cambiar de
          // tipo a mitad del formulario no deja datos del otro colgando.
          medicalRegistry:
            professionalKind === "specialty"
              ? medicalRegistry.trim() || undefined
              : undefined,
          educationEntity:
            professionalKind === "specialty"
              ? educationEntity.trim() || undefined
              : undefined,
          graduationInstitution:
            professionalKind === "specialty"
              ? graduationInstitution.trim() || undefined
              : undefined,
          technicalInstitution:
            professionalKind === "labor"
              ? technicalInstitution.trim() || undefined
              : undefined,
          referralCode: alliedReferral?.code,
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
      if (err instanceof ApiError) {
        setState({ error: err.message });
        return;
      }
      setState({ error: "No se pudo conectar con el servidor." });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm sm:p-8"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Registro de profesionales
        </h1>
        <p className="text-sm text-zinc-500">
          Para especialistas médicos y técnicos laborales. Si representas una
          empresa, usa el{" "}
          <Link href={empresaRegisterHref} className="text-sky-600 underline">
            registro empresarial
          </Link>
          .
        </p>
      </div>

      {referralLoading ? (
        <p className="text-center text-sm text-zinc-500">
          Validando código de empresa aliada…
        </p>
      ) : null}

      {referralError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {referralError}
        </p>
      ) : null}

      {alliedReferral ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Registro con empresa aliada
          </p>
          <p className="mt-1 text-sm text-sky-800">
            {alliedReferral.organizationName}
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tracking-wider text-sky-950">
            {alliedReferral.code}
          </p>
          <p className="mt-1 text-xs text-sky-700">
            Código de referido (no editable)
          </p>
        </div>
      ) : null}

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
              disabled={emailTicket != null}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailOtpSent) resetEmailVerification();
              }}
              required
              autoComplete="email"
            />
            {emailTicket == null && (
              <button
                type="button"
                disabled={!email.trim() || isSendingEmailOtp}
                onClick={handleSendEmailOtp}
                className="h-9 w-full rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                {isSendingEmailOtp
                  ? "Enviando…"
                  : emailOtpSent
                    ? "Reenviar código"
                    : "Enviar código"}
              </button>
            )}
            {emailOtpSent && emailTicket == null && (
              <div className="space-y-2 rounded-lg border border-zinc-200 p-2.5">
                <p className="text-xs text-zinc-500">
                  Te enviamos un código a {email}.
                </p>
                <input
                  className={inputClass}
                  placeholder="Código de verificación"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={emailOtpCode}
                  onChange={(e) => setEmailOtpCode(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!emailOtpCode || isVerifyingEmailOtp}
                  onClick={handleVerifyEmailOtp}
                  className="h-9 w-full rounded-lg bg-sky-500 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-40"
                >
                  {isVerifyingEmailOtp ? "Verificando…" : "Verificar"}
                </button>
              </div>
            )}
            {emailTicket != null && (
              <p className="text-xs text-green-600">Correo verificado.</p>
            )}
            {emailOtpError && <p className="text-xs text-red-600">{emailOtpError}</p>}
          </div>
        </Field>
        <Field label="Celular" required>
          <div className="space-y-2">
            <PhoneSplitInputs
              prefix={phonePrefix}
              nationalNumber={phoneNational}
              disabled={phoneTicket != null}
              onPrefixChange={(value) => {
                setPhonePrefix(value);
                if (otpSent) resetPhoneVerification();
              }}
              onNationalChange={(value) => {
                setPhoneNational(value);
                if (otpSent) resetPhoneVerification();
              }}
            />
            {phoneTicket == null && (
              <button
                type="button"
                disabled={!phoneValid || isSendingOtp}
                onClick={handleSendOtp}
                className="h-9 w-full rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                {isSendingOtp
                  ? "Enviando…"
                  : otpSent
                    ? "Reenviar código"
                    : "Enviar código"}
              </button>
            )}
            {otpSent && phoneTicket == null && (
              <div className="space-y-2 rounded-lg border border-zinc-200 p-2.5">
                <p className="text-xs text-zinc-500">
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
                  className="h-9 w-full rounded-lg bg-sky-500 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-40"
                >
                  {isVerifyingOtp ? "Verificando…" : "Verificar"}
                </button>
              </div>
            )}
            {phoneTicket != null && (
              <p className="text-xs text-green-600">Teléfono verificado.</p>
            )}
            {otpError && <p className="text-xs text-red-600">{otpError}</p>}
          </div>
        </Field>
        <Field label="Tipo de documento" required>
          <select
            className={inputClass}
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            required
          >
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
          <select
            className={inputClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
          >
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
        <div className="sm:col-span-2 space-y-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Tipo de profesional <span className="text-red-500">*</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Elige una opción. Los análisis disponibles dependen del perfil
              configurado por el administrador.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "specialty" as const, label: "Especialidad médica" },
                { id: "labor" as const, label: "Técnico laboral" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  professionalKind === option.id
                    ? "border-sky-500 bg-sky-50 font-medium text-sky-700"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-sky-300"
                }`}
                onClick={() => {
                  setProfessionalKind(option.id);
                  if (option.id === "specialty") setLaborProfile("");
                  else setSpecialty("");
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          {professionalKind === "specialty" ? (
            <Field label="Especialidad" required>
              <select
                className={inputClass}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                required
                disabled={specialtiesQuery.isLoading || specialties.length === 0}
              >
                <option value="">
                  {specialtiesQuery.isLoading
                    ? "Cargando especialidades…"
                    : "Selecciona una especialidad"}
                </option>
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {professionalKind === "labor" ? (
            <Field label="Técnico laboral" required>
              <select
                className={inputClass}
                value={laborProfile}
                onChange={(e) => setLaborProfile(e.target.value)}
                required
                disabled={laborProfilesQuery.isLoading || laborProfiles.length === 0}
              >
                <option value="">
                  {laborProfilesQuery.isLoading
                    ? "Cargando perfiles…"
                    : "Selecciona un técnico laboral"}
                </option>
                {laborProfiles.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
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
            {passwordFocused && password ? (
              <PasswordRequirements password={password} />
            ) : null}
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

        {/* Lo que sigue depende del tipo de profesional: un técnico laboral no
            tiene registro médico ni entidades educativas universitarias. */}
        {professionalKind === "specialty" ? (
          <>
            <Field label="Registro médico" required>
              <input
                className={inputClass}
                placeholder="RM-123456"
                value={medicalRegistry}
                onChange={(e) => setMedicalRegistry(e.target.value)}
                required
              />
            </Field>
            <Field label="Entidad educativa pregrado" required>
              <CatalogCombobox
                typeSlug="education_entity"
                className={inputClass}
                placeholder="Busca tu universidad"
                value={educationEntity}
                onChange={setEducationEntity}
                required
              />
            </Field>
            <Field label="Entidad educativa postgrado (especialización médica)">
              <CatalogCombobox
                typeSlug="education_entity"
                className={inputClass}
                placeholder="Busca la institución de postgrado"
                value={graduationInstitution}
                onChange={setGraduationInstitution}
              />
            </Field>
          </>
        ) : null}
        {professionalKind === "labor" ? (
          <Field label="Institución educativa técnica" required>
            <CatalogCombobox
              typeSlug="technical_education_institution"
              className={inputClass}
              placeholder="Busca tu institución técnica"
              value={technicalInstitution}
              onChange={setTechnicalInstitution}
              required
            />
          </Field>
        ) : null}
      </div>

      <LocationPickerSection picker={locationPicker} />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Subida de documentos</h2>
          <p className="text-xs text-zinc-500">
            Opcional. Puedes cargarlos más adelante al completar tu registro.
          </p>
        </div>
        {/* Los documentos dependen del tipo de profesional: mostrarlos antes de
            elegirlo pediría los equivocados. */}
        {professionalKind ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {doctorDocuments(professionalKind).map((doc) => (
              <DocUploadCard
                key={doc.field}
                title={doc.label}
                file={documents[doc.field] ?? null}
                onChange={(file) =>
                  setDocuments((prev) => ({ ...prev, [doc.field]: file }))
                }
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center text-sm text-zinc-500">
            Elige el tipo de profesional para ver los documentos que debes
            adjuntar.
          </p>
        )}
      </section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={
          isPending ||
          phoneTicket == null ||
          referralLoading ||
          Boolean(initialReferralCode?.trim() && !alliedReferral)
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
