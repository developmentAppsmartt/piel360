"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudUpload } from "lucide-react";
import { LocationPickerSection, useLocationPicker } from "@/components/auth/location-picker-section";
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
import { sendPhoneOtpAction, verifyPhoneOtpAction } from "@/lib/actions/phone-otp";
import { homeForUser } from "@/lib/auth-redirect";
import { ApiError } from "@/lib/api-error";
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

export function DoctorRegisterForm() {
  const router = useRouter();
  const locationPicker = useLocationPicker();
  const specialtiesQuery = useSpecialties();
  const laborProfilesQuery = useLaborTechnicianProfiles();
  const specialties = specialtiesQuery.data?.map((item) => item.name) ?? [];
  const laborProfiles = laborProfilesQuery.data?.map((item) => item.name) ?? [];
  const [state, setState] = useState<AuthActionState>({});
  const [isPending, setIsPending] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const [licenseNumber, setLicenseNumber] = useState("");
  const [educationEntity, setEducationEntity] = useState("");
  const [graduationInstitution, setGraduationInstitution] = useState("");
  const [cedula, setCedula] = useState<File | null>(null);
  const [medicalRegistryDoc, setMedicalRegistryDoc] = useState<File | null>(null);
  const [diploma, setDiploma] = useState<File | null>(null);

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

  function resetPhoneVerification() {
    setOtpSent(false);
    setOtpCode("");
    setPhoneTicket(null);
    setVerifiedPhone(null);
    setOtpError(null);
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
    if (!professionalKind) {
      setState({ error: "Elige si eres especialista médico o técnico laboral." });
      return;
    }
    if (professionalKind === "specialty" && !specialty.trim()) {
      setState({ error: "Selecciona una especialidad médica." });
      return;
    }
    if (professionalKind === "labor" && !laborProfile.trim()) {
      setState({ error: "Selecciona un perfil de técnico laboral." });
      return;
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
          medicalRegistry: medicalRegistry.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          educationEntity: educationEntity.trim() || undefined,
          graduationInstitution: graduationInstitution.trim() || undefined,
        },
        { cedula, medicalRegistryDoc, diploma },
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
          <Link href="/doctor/register/empresa" className="text-sky-600 underline">
            registro empresarial
          </Link>
          .
        </p>
      </div>

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
          <input
            className={inputClass}
            type="email"
            placeholder="ana@clinica.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
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
        <Field label="Género">
          <select
            className={inputClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Seleccionar</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha de nacimiento">
          <input
            className={inputClass}
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
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
          <input
            className={inputClass}
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </Field>
        <Field label="Registro médico">
          <input
            className={inputClass}
            placeholder="RM-123456"
            value={medicalRegistry}
            onChange={(e) => setMedicalRegistry(e.target.value)}
          />
        </Field>
        <Field label="Número de licencia">
          <input
            className={inputClass}
            placeholder="LIC-0098"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />
        </Field>
        <Field label="Entidad educativa">
          <input
            className={inputClass}
            placeholder="Universidad"
            value={educationEntity}
            onChange={(e) => setEducationEntity(e.target.value)}
          />
        </Field>
        <Field label="Institución de egreso">
          <input
            className={inputClass}
            placeholder="Facultad / Instituto"
            value={graduationInstitution}
            onChange={(e) => setGraduationInstitution(e.target.value)}
          />
        </Field>
      </div>

      <LocationPickerSection picker={locationPicker} />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Subida de documentos</h2>
          <p className="text-xs text-zinc-500">
            Opcional. Puedes cargarlos más adelante al completar tu registro.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <DocUploadCard title="Cédula" file={cedula} onChange={setCedula} />
          <DocUploadCard
            title="Registro Médico"
            file={medicalRegistryDoc}
            onChange={setMedicalRegistryDoc}
          />
          <DocUploadCard title="Diploma" file={diploma} onChange={setDiploma} />
        </div>
      </section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending || phoneTicket == null}
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
