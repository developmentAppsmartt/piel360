"use client";

import { useRef, useState } from "react";
import { AccountSecuritySection } from "@/components/auth/account-security-section";
import { AddressLocationPicker } from "@/components/maps";
import {
  combinePhoneParts,
  isValidE164Digits,
  splitPhoneDigits,
} from "@/components/auth/auth-form-primitives";
import { PhoneOtpField } from "@/components/auth/phone-otp-field";
import { ProfilePhotoField } from "@/components/profile/profile-photo-field";
import { Button } from "@/components/ui/button";
import { verifyPhoneOtpAction } from "@/lib/actions/phone-otp";
import { ApiError } from "@/lib/api-error";
import { sendPhoneOtpForProfile } from "@/lib/phone-otp-client";
import {
  isEnterpriseDoctor,
  useMyDoctorProfile,
  useUpdateMyDoctorProfile,
  useUploadDoctorDocuments,
  type DoctorProfileInput,
  type MyDoctorProfile,
} from "@/lib/queries/doctors";
import { doctorDocuments } from "@/lib/doctor-documents";
import {
  CompanyProfileSection,
  type CompanyProfileHandle,
} from "./company-profile-section";
import { DocPreview, Field } from "./doc-preview";
import { DoctorProfessionalFields } from "./doctor-professional-fields";
import {
  DOC_TYPES,
  inputClass,
  profileToForm,
  type SetDoctorProfileField,
} from "./doctor-profile-values";
import { VerificationNoteBanner } from "./verification-note-banner";

const VERIFICATION_LABELS: Record<string, string> = {
  in_review: "ajustes solicitados",
  pending: "pendiente de verificación",
  rejected: "rechazado",
  active: "verificado",
  approved: "verificado",
  verified: "verificado",
};

export function DoctorProfileForm() {
  const query = useMyDoctorProfile();

  if (query.isPending) {
    return <p className="text-sm text-muted-foreground">Cargando tu cuenta…</p>;
  }

  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar la información de tu cuenta.
      </p>
    );
  }

  // El formulario se inicializa una vez por perfil: subir la foto o cambiar el
  // correo vuelve a pedir el perfil y no debe borrar lo que se está escribiendo.
  return (
    <DoctorProfileFormBody
      key={query.data.id}
      profile={query.data}
      onEmailChanged={() => void query.refetch()}
    />
  );
}

function DoctorProfileFormBody({
  profile,
  onEmailChanged,
}: {
  profile: MyDoctorProfile;
  onEmailChanged: () => void;
}) {
  const mutation = useUpdateMyDoctorProfile();
  const uploadDocs = useUploadDoctorDocuments();
  const companyRef = useRef<CompanyProfileHandle>(null);
  const [form, setForm] = useState(() => profileToForm(profile));
  /** Archivos por clave del FormData — la lista sale de doctorDocuments(). */
  const [documents, setDocuments] = useState<Record<string, File | null>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const initialPhone = splitPhoneDigits(profile.phone ?? "");
  const [phonePrefix, setPhonePrefix] = useState(initialPhone.prefix);
  const [phoneNational, setPhoneNational] = useState(initialPhone.national);
  const [originalPhoneDigits, setOriginalPhoneDigits] = useState(() =>
    combinePhoneParts(initialPhone.prefix, initialPhone.national),
  );
  const [phoneTicket, setPhoneTicket] = useState<string | null>(null);

  const showCompany = isEnterpriseDoctor(profile);
  const email = profile.user?.email ?? "";
  const saving = savingAll || mutation.isPending || uploadDocs.isPending;

  const set: SetDoctorProfileField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const phone = combinePhoneParts(phonePrefix, phoneNational);
    if (phone && !isValidE164Digits(phone)) {
      setError(
        "Celular inválido — revisa el prefijo (ej. 57) y el número (10 a 15 dígitos en total).",
      );
      return;
    }

    const phoneChanged = phone !== originalPhoneDigits;
    if (phoneChanged && phone && !phoneTicket) {
      setError("Verifica tu nuevo celular con el código SMS antes de guardar.");
      return;
    }

    const payload: DoctorProfileInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: phone || undefined,
      ...(phoneChanged && phoneTicket ? { phoneTicket } : {}),
      docType: form.docType || undefined,
      docNumber: form.docNumber.trim() || undefined,
      ...(showCompany
        ? {}
        : {
            gender: form.gender || undefined,
            birthDate: form.birthDate || undefined,
            specialty: form.specialty || undefined,
            medicalRegistry: form.medicalRegistry.trim() || undefined,
            educationEntity: form.educationEntity.trim() || undefined,
            graduationInstitution: form.graduationInstitution.trim() || undefined,
            technicalInstitution: form.technicalInstitution.trim() || undefined,
            address: form.address.trim() || undefined,
            city: form.city.trim() || undefined,
            department: form.department.trim() || undefined,
            country: form.country.trim() || undefined,
            zip: form.zip.trim() || undefined,
            ...(form.lat != null && form.lng != null
              ? { lat: form.lat, lng: form.lng }
              : {}),
          }),
    };

    setSavingAll(true);
    try {
      await mutation.mutateAsync(payload);

      if (phone) {
        setOriginalPhoneDigits(phone);
        setPhoneTicket(null);
      }

      const pendingDocs = Object.entries(documents).filter(
        (entry): entry is [string, File] => Boolean(entry[1]),
      );
      if (pendingDocs.length > 0) {
        const docs = new FormData();
        for (const [field, file] of pendingDocs) docs.set(field, file);
        await uploadDocs.mutateAsync(docs);
        setDocuments({});
      }

      if (showCompany && companyRef.current?.isReady()) {
        await companyRef.current.save();
        setMessage("Perfil y empresa actualizados.");
      } else {
        setMessage("Cuenta actualizada.");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo guardar.",
      );
    } finally {
      setSavingAll(false);
    }
  }

  const verificationLabel = profile.verificationStatus
    ? (VERIFICATION_LABELS[profile.verificationStatus] ?? profile.verificationStatus)
    : null;

  return (
    <div className="max-w-4xl space-y-8">
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {showCompany ? "Representante legal" : "Información personal"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {showCompany
                ? "Datos del representante legal de la empresa."
                : "Datos de tu cuenta profesional."}
              {verificationLabel ? ` Estado: ${verificationLabel}.` : null}
            </p>
          </div>

          <ProfilePhotoField avatarUrl={profile.avatarUrl} email={email} />

          <VerificationNoteBanner
            status={profile.verificationStatus}
            note={profile.verificationNote}
            noteAt={profile.verificationNoteAt}
            fixHint
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                className={inputClass}
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
              />
            </Field>
            <Field label="Apellidos">
              <input
                className={inputClass}
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                required
              />
            </Field>
            <Field
              label="Correo"
              hint="Es tu usuario de acceso. Se cambia abajo, en Acceso y seguridad."
            >
              <input className={inputClass} value={email} disabled readOnly />
            </Field>
            <Field label="Celular">
              <PhoneOtpField
                phonePrefix={phonePrefix}
                phoneNational={phoneNational}
                onPrefixChange={setPhonePrefix}
                onNationalChange={setPhoneNational}
                originalPhoneDigits={originalPhoneDigits}
                phoneTicket={phoneTicket}
                onPhoneTicketChange={setPhoneTicket}
                sendOtp={sendPhoneOtpForProfile}
                verifyOtp={verifyPhoneOtpAction}
                inputClass={inputClass}
              />
            </Field>
            <Field label="Tipo de documento">
              <select
                className={inputClass}
                value={form.docType}
                onChange={(e) => set("docType", e.target.value)}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Número de documento">
              <input
                className={inputClass}
                value={form.docNumber}
                onChange={(e) => set("docNumber", e.target.value)}
              />
            </Field>
            {!showCompany ? (
              <DoctorProfessionalFields
                form={form}
                set={set}
                professionalKind={profile.professionalKind}
              />
            ) : null}
          </div>

          {!showCompany ? (
            <>
              <AddressLocationPicker
                showAdminFields
                value={{
                  address: form.address,
                  lat: form.lat,
                  lng: form.lng,
                  city: form.city,
                  department: form.department,
                  country: form.country,
                  zip: form.zip,
                }}
                onChange={(next) =>
                  setForm((prev) => ({
                    ...prev,
                    address: next.address,
                    lat: next.lat,
                    lng: next.lng,
                    city: next.city ?? "",
                    department: next.department ?? "",
                    country: next.country ?? "",
                    zip: next.zip ?? "",
                  }))
                }
              />

              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Documentos</h2>
                <p className="text-xs text-muted-foreground">
                  PDF, JPG o PNG. Los documentos dependen de tu tipo de profesional.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {doctorDocuments(profile.professionalKind).map((doc) => (
                    <DocPreview
                      key={doc.field}
                      title={doc.label}
                      url={profile[doc.docUrl]}
                      fileKey={profile[doc.docKey]}
                      file={documents[doc.field] ?? null}
                      optional={doc.optional}
                      onChange={(file) =>
                        setDocuments((prev) => ({ ...prev, [doc.field]: file }))
                      }
                    />
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {showCompany ? <CompanyProfileSection ref={companyRef} /> : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving
              ? "Guardando…"
              : showCompany
                ? "Guardar cambios y empresa"
                : "Guardar cambios"}
          </Button>
        </div>
      </form>

      <AccountSecuritySection
        email={email}
        phone={combinePhoneParts(phonePrefix, phoneNational)}
        onEmailChanged={onEmailChanged}
      />
    </div>
  );
}
