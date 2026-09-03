"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudUpload } from "lucide-react";
import type { MembershipType } from "@piel360/shared";
import {
  combinePhoneParts,
  digitsOnly,
  Field,
  inputClass,
  isValidE164Digits,
  PhoneSplitInputs,
} from "@/components/auth/auth-form-primitives";
import {
  LocationPickerSection,
  useLocationPicker,
} from "@/components/auth/location-picker-section";
import {
  establishSessionAction,
  type AuthActionState,
} from "@/lib/actions/auth";
import { sendPhoneOtpAction, verifyPhoneOtpAction } from "@/lib/actions/phone-otp";
import { homeForUser } from "@/lib/auth-redirect";
import { ApiError } from "@/lib/api-error";
import { registerEmpresaWithDocuments } from "@/lib/empresa-register-client";

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501+"] as const;
const DOC_TYPES = ["CC", "CE", "NIT", "PA"] as const;

const MEMBERSHIP_OPTIONS: {
  value: Extract<MembershipType, "empresa" | "empresa_aliada">;
  label: string;
  hint: string;
}[] = [
  {
    value: "empresa",
    label: "Membresía empresa",
    hint: "Equipos según plan de espacios.",
  },
  {
    value: "empresa_aliada",
    label: "Empresa aliada",
    hint: "Equipos con programa de referidos.",
  },
];

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

export function EmpresaRegisterForm() {
  const router = useRouter();
  const locationPicker = useLocationPicker();
  const [state, setState] = useState<AuthActionState>({});
  const [isPending, setIsPending] = useState(false);

  const [membershipType, setMembershipType] =
    useState<Extract<MembershipType, "empresa" | "empresa_aliada">>("empresa");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("57");
  const [phoneNational, setPhoneNational] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [ciiuCode, setCiiuCode] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [employeeCountRange, setEmployeeCountRange] = useState("");
  const [legalRepName, setLegalRepName] = useState("");
  const [legalRepDocType, setLegalRepDocType] = useState<string>(DOC_TYPES[0]);
  const [legalRepDocNumber, setLegalRepDocNumber] = useState("");

  const [legalRepCedula, setLegalRepCedula] = useState<File | null>(null);
  const [rut, setRut] = useState<File | null>(null);
  const [existenceCert, setExistenceCert] = useState<File | null>(null);

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
    if (!organizationName.trim()) {
      setState({ error: "El nombre de la empresa es obligatorio." });
      return;
    }
    if (!legalRepName.trim()) {
      setState({ error: "Indica el nombre del representante legal." });
      return;
    }
    if (!legalRepDocNumber.trim()) {
      setState({ error: "Indica el documento del representante legal." });
      return;
    }
    if (!locationPicker.location) {
      setState({ error: "Marca la ubicación de la empresa en el mapa." });
      return;
    }

    const businessPhoneDigits = digitsOnly(businessPhone);
    if (businessPhoneDigits && !/^\d{10,15}$/.test(businessPhoneDigits)) {
      setState({
        error:
          "Teléfono empresarial inválido — usa solo dígitos (10 a 15).",
      });
      return;
    }

    const phoneForRegister = verifiedPhone ?? phone;

    setIsPending(true);
    try {
      const { result, docUploadError } = await registerEmpresaWithDocuments(
        {
          email: email.trim(),
          password,
          phone: phoneForRegister,
          phoneTicket: phoneTicket ?? undefined,
          membershipType,
          organizationName: organizationName.trim(),
          ciiuCode: ciiuCode.trim() || undefined,
          businessEmail: businessEmail.trim() || undefined,
          businessPhone: businessPhoneDigits || undefined,
          website: website.trim() || undefined,
          employeeCountRange: employeeCountRange || undefined,
          legalRepName: legalRepName.trim(),
          legalRepDocType: legalRepDocType || undefined,
          legalRepDocNumber: legalRepDocNumber.trim(),
          address: locationPicker.address || locationPicker.addressQuery,
          country: "CO",
          lat: locationPicker.location.lat,
          lng: locationPicker.location.lng,
        },
        { legalRepCedula, rut, existenceCert },
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
      setState({ error: "No se pudo crear la cuenta empresarial." });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm sm:p-8"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Registro de empresa</h1>
        <p className="text-sm text-zinc-500">
          Crea la cuenta de tu clínica o centro. Incluye datos comerciales y ubicación.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-zinc-900">
          Tipo de empresa <span className="text-red-500">*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MEMBERSHIP_OPTIONS.map((opt) => {
            const selected = membershipType === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                  selected
                    ? "border-sky-500 bg-sky-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="membershipType"
                  className="mt-1"
                  checked={selected}
                  onChange={() => setMembershipType(opt.value)}
                />
                <span>
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-zinc-500">{opt.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Acceso a la plataforma</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Correo de acceso" required>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Contraseña" required>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
        </div>

        <Field label="Celular del representante" required>
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
            {phoneTicket ? (
              <p className="text-xs text-emerald-600">Celular verificado.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {!otpSent ? (
                  <button
                    type="button"
                    disabled={!phoneValid || isSendingOtp}
                    onClick={handleSendOtp}
                    className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {isSendingOtp ? "Enviando…" : "Enviar código"}
                  </button>
                ) : (
                  <>
                    <p className="w-full text-xs text-zinc-500">
                      Código enviado a +{phone}
                    </p>
                    <input
                      className={`${inputClass} max-w-32`}
                      placeholder="Código"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={otpCode.length < 4 || isVerifyingOtp}
                      onClick={handleVerifyOtp}
                      className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {isVerifyingOtp ? "Verificando…" : "Verificar"}
                    </button>
                  </>
                )}
              </div>
            )}
            {otpError ? <p className="text-xs text-red-600">{otpError}</p> : null}
          </div>
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Información de la empresa</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la empresa" required>
            <input
              className={inputClass}
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
            />
          </Field>
          <Field label="Código CIIU principal">
            <input
              className={inputClass}
              value={ciiuCode}
              onChange={(e) => setCiiuCode(e.target.value)}
              placeholder="Ej. 8621"
            />
          </Field>
          <Field label="Correo electrónico empresarial">
            <input
              className={inputClass}
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
            />
          </Field>
          <Field label="Teléfono de contacto">
            <input
              className={inputClass}
              type="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
            />
          </Field>
          <Field label="Sitio web" optional>
            <input
              className={inputClass}
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="Número de empleados (aprox.)">
            <select
              className={inputClass}
              value={employeeCountRange}
              onChange={(e) => setEmployeeCountRange(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {EMPLOYEE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Representante legal</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nombre completo" required>
              <input
                className={inputClass}
                value={legalRepName}
                onChange={(e) => setLegalRepName(e.target.value)}
                required
              />
            </Field>
            <Field label="Tipo de documento">
              <select
                className={inputClass}
                value={legalRepDocType}
                onChange={(e) => setLegalRepDocType(e.target.value)}
              >
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Número de documento" required>
              <input
                className={inputClass}
                value={legalRepDocNumber}
                onChange={(e) => setLegalRepDocNumber(e.target.value)}
                required
              />
            </Field>
          </div>
        </div>
      </section>

      <LocationPickerSection
        picker={locationPicker}
        title="Ubicación de la empresa"
        description="Busca la sede principal o marca el punto en el mapa."
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Documentos requeridos</h2>
          <p className="text-xs text-zinc-500">
            Cédula del representante, RUT y certificado de existencia. Opcional en
            este paso; puedes subirlos después en Configuración.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <DocUploadCard
            title="Cédula del representante"
            file={legalRepCedula}
            onChange={setLegalRepCedula}
          />
          <DocUploadCard title="RUT de la empresa" file={rut} onChange={setRut} />
          <DocUploadCard
            title="Certificado de existencia"
            file={existenceCert}
            onChange={setExistenceCert}
          />
        </div>
      </section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending || phoneTicket == null}
        className="h-12 w-full rounded-xl bg-sky-500 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-40 sm:w-auto sm:px-10"
      >
        {isPending ? "Creando cuenta…" : "Crear cuenta empresarial"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        ¿Ya tienes cuenta empresarial?{" "}
        <Link href="/doctor/login/empresa" className="font-medium text-sky-600 underline">
          Iniciar sesión
        </Link>
        {" · "}
        ¿Eres profesional individual?{" "}
        <Link href="/doctor/register" className="font-medium text-sky-600 underline">
          Registro profesional
        </Link>
      </p>
    </form>
  );
}
