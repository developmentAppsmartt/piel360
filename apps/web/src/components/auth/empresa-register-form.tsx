"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MembershipType } from "@piel360/shared";
import {
  combinePhoneParts,
  digitsOnly,
  Field,
  inputClass,
  isValidE164Digits,
  PhoneSplitInputs,
} from "@/components/auth/auth-form-primitives";
import { LocationPickerSection, useLocationPicker } from "@/components/auth/location-picker-section";
import { establishSessionAction, type AuthActionState } from "@/lib/actions/auth";
import { sendPhoneOtpAction, verifyPhoneOtpAction } from "@/lib/actions/phone-otp";
import { homeForUser } from "@/lib/auth-redirect";
import { ApiError } from "@/lib/api-error";
import { registerEmpresaWithDocuments } from "@/lib/empresa-register-client";
import { PhoneField } from "@/components/ui/phone-field";
import {
  LegalAcceptanceChecks,
  NO_LEGAL_CHECKS,
  legalChecksComplete,
  type LegalChecks,
} from "@/components/legal/legal-acceptance-checks";
import { AlliedReferralNotice } from "./register/allied-referral-notice";
import { DocUploadCard } from "./register/doc-upload-card";
import { companyError, EMPTY_COMPANY, EmpresaCompanyFields, type CompanyValues } from "./register/empresa-company-fields";
import { OtpVerifyControls } from "./register/otp-verify-controls";
import { useAlliedReferral } from "./register/use-allied-referral";
import { useOtpVerification } from "./register/use-otp-verification";

type EmpresaMembership = Extract<MembershipType, "empresa" | "empresa_aliada">;

const MEMBERSHIP_OPTIONS: { value: EmpresaMembership; label: string; hint: string }[] = [
  { value: "empresa", label: "Membresía empresa", hint: "Equipos según plan de espacios." },
  { value: "empresa_aliada", label: "Empresa aliada", hint: "Equipos con programa de referidos." },
];

export function EmpresaRegisterForm({ referralCode: initialReferralCode }: { referralCode?: string } = {}) {
  const router = useRouter();
  const locationPicker = useLocationPicker();
  const allied = useAlliedReferral(initialReferralCode);
  const [state, setState] = useState<AuthActionState>({});
  const [isPending, setIsPending] = useState(false);
  const [membershipType, setMembershipType] = useState<EmpresaMembership>("empresa");

  const professionalRegisterHref = allied.code
    ? `/doctor/register?ref=${encodeURIComponent(allied.code)}`
    : "/doctor/register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("57");
  const [phoneNational, setPhoneNational] = useState("");
  const [company, setCompany] = useState<CompanyValues>(EMPTY_COMPANY);
  const [legalRepCedula, setLegalRepCedula] = useState<File | null>(null);
  const [rut, setRut] = useState<File | null>(null);
  const [existenceCert, setExistenceCert] = useState<File | null>(null);
  const [legal, setLegal] = useState<LegalChecks>(NO_LEGAL_CHECKS);

  const phone = combinePhoneParts(phonePrefix, phoneNational);
  const phoneValid =
    digitsOnly(phonePrefix).length >= 1 && digitsOnly(phoneNational).length >= 7 && isValidE164Digits(phone);
  const phoneOtp = useOtpVerification(phone, sendPhoneOtpAction, verifyPhoneOtpAction);
  const isAllied = membershipType === "empresa_aliada";
  // El API guarda el teléfono empresarial solo con dígitos (indicativo incluido).
  const businessPhoneDigits = digitsOnly(company.businessPhone);

  function validationError(): string | null {
    if (!phoneValid) return "Celular inválido — revisa el prefijo (ej. 57) y el número (10 a 15 dígitos en total).";
    if (!phoneOtp.ticket) return "Verifica tu celular antes de continuar.";
    const companyProblem = companyError(company, isAllied);
    if (companyProblem) return companyProblem;
    if (!locationPicker.location) return "Marca la ubicación de la empresa en el mapa.";
    if (businessPhoneDigits && !/^\d{10,15}$/.test(businessPhoneDigits)) {
      return "Teléfono empresarial inválido — revisa el número.";
    }
    if (!legalChecksComplete(legal)) return "Debes aceptar los Términos y Condiciones y la Política de Tratamiento de Datos.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validationError();
    setState(problem ? { error: problem } : {});
    if (problem || !locationPicker.location) return;

    const c = company;
    setIsPending(true);
    try {
      const { result, docUploadError } = await registerEmpresaWithDocuments(
        {
          email: email.trim(),
          password,
          phone: phoneOtp.verifiedValue ?? phone,
          phoneTicket: phoneOtp.ticket ?? undefined,
          membershipType,
          organizationName: c.organizationName.trim(),
          ciiuCode: c.ciiuCode.trim() || undefined,
          businessEmail: c.businessEmail.trim() || undefined,
          businessPhone: businessPhoneDigits || undefined,
          website: c.website.trim() || undefined,
          employeeCountRange: c.employeeCountRange || undefined,
          legalRepName: c.legalRepName.trim(),
          legalRepDocType: c.legalRepDocType || undefined,
          legalRepDocNumber: c.legalRepDocNumber.trim(),
          address: locationPicker.address || locationPicker.addressQuery,
          country: locationPicker.country.trim() || undefined,
          lat: locationPicker.location.lat,
          lng: locationPicker.location.lng,
          ...(isAllied
            ? {
                bankName: c.bankName.trim() || undefined,
                bankId: c.bankId.trim() || undefined,
                bankAccountType: c.bankAccountType || undefined,
                bankAccountNumber: c.bankAccountNumber.trim() || undefined,
                payoutBeneficiaryName: c.payoutBeneficiaryName.trim() || undefined,
                payoutBeneficiaryEmail: c.payoutBeneficiaryEmail.trim() || undefined,
                payoutLegalIdType: c.payoutLegalIdType || undefined,
                payoutLegalId: c.payoutLegalId.trim() || undefined,
              }
            : {}),
          referralCode: allied.code,
          acceptTerms: true,
          acceptPrivacy: true,
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
      setState({ error: err instanceof ApiError ? err.message : "No se pudo crear la cuenta empresarial." });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm sm:p-8"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Registro de Empresa</h1>
        <p className="text-sm text-zinc-500">
          Crea la cuenta de tu clínica o centro. Incluye datos comerciales y ubicación. ¿Eres profesional
          individual? Usa el{" "}
          <Link href={professionalRegisterHref} className="text-sky-600 underline">
            registro de Profesionales
          </Link>
          .
        </p>
      </div>

      <AlliedReferralNotice loading={allied.loading} error={allied.error} referral={allied.referral} />

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
                  selected ? "border-sky-500 bg-sky-50" : "border-zinc-200 bg-white hover:border-zinc-300"
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
              verifiedLabel="Celular verificado."
            />
          </div>
        </Field>
      </section>

      <EmpresaCompanyFields
        value={company}
        onChange={setCompany}
        allied={isAllied}
        phoneField={
          <PhoneField
            value={company.businessPhone}
            onChange={(value) => setCompany({ ...company, businessPhone: value })}
            required
          />
        }
      />

      <LocationPickerSection
        picker={locationPicker}
        title="Ubicación de la empresa"
        description="Busca la sede principal o marca el punto en el mapa."
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Documentos requeridos</h2>
          <p className="text-xs text-zinc-500">
            Cédula del representante, RUT y certificado de existencia. Opcional en este paso; puedes subirlos
            después en Configuración.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <DocUploadCard title="Cédula del representante" file={legalRepCedula} onChange={setLegalRepCedula} />
          <DocUploadCard title="RUT de la empresa" file={rut} onChange={setRut} />
          <DocUploadCard title="Certificado de existencia" file={existenceCert} onChange={setExistenceCert} />
        </div>
      </section>

      <LegalAcceptanceChecks value={legal} onChange={setLegal} disabled={isPending} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending || phoneOtp.ticket == null || !legalChecksComplete(legal)}
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
        <Link href={professionalRegisterHref} className="font-medium text-sky-600 underline">
          Registro profesional
        </Link>
      </p>
    </form>
  );
}
