"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CloudUpload } from "lucide-react";
import { AddressLocationPicker } from "@/components/maps";
import {
  combinePhoneParts,
  isValidE164Digits,
  splitPhoneDigits,
} from "@/components/auth/auth-form-primitives";
import { PhoneOtpField } from "@/components/auth/phone-otp-field";
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
import { useSpecialties } from "@/lib/queries/specialties";
import { useLaborTechnicianProfiles } from "@/lib/queries/labor-technician-profiles";
import {
  CompanyProfileSection,
  type CompanyProfileHandle,
} from "./company-profile-section";

function isCompanyMembership(profile: MyDoctorProfile) {
  return isEnterpriseDoctor(profile);
}

const DOC_TYPES = ["CC", "CE", "TI", "PA"] as const;

const GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
] as const;

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500 disabled:bg-muted";

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function toCoord(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isPdfUrl(url: string | null | undefined, key: string | null | undefined) {
  const src = `${url ?? ""} ${key ?? ""}`.toLowerCase();
  return src.includes(".pdf");
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
      {children}
    </label>
  );
}

function DocPreview({
  title,
  url,
  fileKey,
  file,
  onChange,
}: {
  title: string;
  url: string | null | undefined;
  fileKey: string | null | undefined;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const previewUrl = file ? URL.createObjectURL(file) : url;
  const pdf = file
    ? file.type === "application/pdf"
    : isPdfUrl(url, fileKey);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <p className="text-sm font-medium">{title}</p>
      {previewUrl ? (
        pdf ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-dashed border-border bg-muted/40 px-3 py-8 text-center text-sm text-sky-700 underline"
          >
            Ver PDF
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={title}
            className="h-40 w-full rounded-lg border border-border object-contain bg-muted/30"
          />
        )
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
          Sin documento
        </div>
      )}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-muted/50">
        <CloudUpload className="size-4" />
        {file ? file.name : "Subir / reemplazar"}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.files?.[0] ?? null);
          }}
        />
      </label>
    </div>
  );
}

function profileToForm(p: MyDoctorProfile) {
  const lat = toCoord(p.lat);
  const lng = toCoord(p.lng);
  return {
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    email: p.user?.email ?? "",
    docType: p.docType ?? "CC",
    docNumber: p.docNumber ?? "",
    gender: p.gender ?? "",
    birthDate: toDateInput(p.birthDate),
    specialty: p.specialty ?? "",
    medicalRegistry: p.medicalRegistry ?? "",
    licenseNumber: p.licenseNumber ?? "",
    educationEntity: p.educationEntity ?? "",
    graduationInstitution: p.graduationInstitution ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    department: p.department ?? "",
    country: p.country ?? "",
    zip: p.zip ?? "",
    lat,
    lng,
  };
}

export function DoctorProfileForm() {
  const query = useMyDoctorProfile();
  const isEmpresa = query.data ? isCompanyMembership(query.data) : false;
  const specialtiesQuery = useSpecialties(!isEmpresa);
  const laborProfilesQuery = useLaborTechnicianProfiles(!isEmpresa);
  const medicalSpecialties = specialtiesQuery.data?.map((item) => item.name) ?? [];
  const laborProfiles = laborProfilesQuery.data?.map((item) => item.name) ?? [];
  const professionalProfiles = [...medicalSpecialties, ...laborProfiles];
  const mutation = useUpdateMyDoctorProfile();
  const uploadDocs = useUploadDoctorDocuments();
  const companyRef = useRef<CompanyProfileHandle>(null);
  const [form, setForm] = useState<ReturnType<typeof profileToForm> | null>(
    null,
  );
  const [cedula, setCedula] = useState<File | null>(null);
  const [medicalRegistryDoc, setMedicalRegistryDoc] = useState<File | null>(
    null,
  );
  const [diploma, setDiploma] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState("57");
  const [phoneNational, setPhoneNational] = useState("");
  const [originalPhoneDigits, setOriginalPhoneDigits] = useState("");
  const [phoneTicket, setPhoneTicket] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) {
      setForm(profileToForm(query.data));
      const split = splitPhoneDigits(query.data.phone ?? "");
      const normalized = combinePhoneParts(split.prefix, split.national);
      setOriginalPhoneDigits(normalized);
      setPhonePrefix(split.prefix);
      setPhoneNational(split.national);
      setPhoneTicket(null);
    }
  }, [query.data]);

  const displayForm = form ?? (query.data ? profileToForm(query.data) : null);

  function set<K extends keyof NonNullable<typeof displayForm>>(
    key: K,
    value: NonNullable<typeof displayForm>[K],
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayForm) return;
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

    const profile = query.data;
    const showCompany = profile ? isCompanyMembership(profile) : false;

    const payload: DoctorProfileInput = {
      firstName: displayForm.firstName.trim(),
      lastName: displayForm.lastName.trim(),
      phone: phone || undefined,
      ...(phoneChanged && phoneTicket ? { phoneTicket } : {}),
      docType: displayForm.docType || undefined,
      docNumber: displayForm.docNumber.trim() || undefined,
      ...(showCompany
        ? {}
        : {
            gender: displayForm.gender || undefined,
            birthDate: displayForm.birthDate || undefined,
            specialty: displayForm.specialty || undefined,
            medicalRegistry: displayForm.medicalRegistry.trim() || undefined,
            licenseNumber: displayForm.licenseNumber.trim() || undefined,
            educationEntity: displayForm.educationEntity.trim() || undefined,
            graduationInstitution:
              displayForm.graduationInstitution.trim() || undefined,
            address: displayForm.address.trim() || undefined,
            city: displayForm.city.trim() || undefined,
            department: displayForm.department.trim() || undefined,
            country: displayForm.country.trim() || undefined,
            zip: displayForm.zip.trim() || undefined,
            ...(displayForm.lat != null && displayForm.lng != null
              ? { lat: displayForm.lat, lng: displayForm.lng }
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

      if (cedula || medicalRegistryDoc || diploma) {
        const docs = new FormData();
        if (cedula) docs.set("cedula", cedula);
        if (medicalRegistryDoc)
          docs.set("medicalRegistryDoc", medicalRegistryDoc);
        if (diploma) docs.set("diploma", diploma);
        await uploadDocs.mutateAsync(docs);
        setCedula(null);
        setMedicalRegistryDoc(null);
        setDiploma(null);
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

  if (!displayForm) {
    return <p className="text-sm text-muted-foreground">Cargando tu cuenta…</p>;
  }

  const profile = query.data;
  const saving =
    savingAll || mutation.isPending || uploadDocs.isPending;
  const showCompany = isCompanyMembership(profile);

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-8">
      <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {showCompany ? "Representante legal" : "Información personal"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {showCompany
            ? "Datos del representante legal de la empresa. El correo no se puede cambiar."
            : "Datos de tu cuenta profesional. El correo no se puede cambiar."}
          {profile.verificationStatus
            ? ` Estado: ${
                profile.verificationStatus === "in_review"
                  ? "ajustes solicitados"
                  : profile.verificationStatus === "pending"
                    ? "pendiente de verificación"
                    : profile.verificationStatus === "rejected"
                      ? "rechazado"
                      : profile.verificationStatus === "active" ||
                          profile.verificationStatus === "approved" ||
                          profile.verificationStatus === "verified"
                        ? "verificado"
                        : profile.verificationStatus
              }.`
            : null}
        </p>
      </div>

      {profile.verificationNote &&
      (profile.verificationStatus === "in_review" ||
        profile.verificationStatus === "rejected" ||
        profile.verificationStatus === "pending") ? (
        <div
          className={
            profile.verificationStatus === "rejected"
              ? "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          }
          role="status"
        >
          <p className="font-semibold">
            {profile.verificationStatus === "rejected"
              ? "Tu solicitud fue rechazada"
              : "El equipo de verificación solicitó ajustes"}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{profile.verificationNote}</p>
          {profile.verificationNoteAt ? (
            <p className="mt-2 text-xs opacity-80">
              {new Date(profile.verificationNoteAt).toLocaleString("es-CO")}
            </p>
          ) : null}
          <p className="mt-2 text-xs">
            Corrige la información indicada y guarda los cambios para que
            vuelvan a revisar tu cuenta.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <input
            className={inputClass}
            value={displayForm.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            required
          />
        </Field>
        <Field label="Apellidos">
          <input
            className={inputClass}
            value={displayForm.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            required
          />
        </Field>
        <Field label="Correo" >
          <input className={inputClass} value={displayForm.email} disabled readOnly />
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
            value={displayForm.docType}
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
            value={displayForm.docNumber}
            onChange={(e) => set("docNumber", e.target.value)}
          />
        </Field>
        {!showCompany ? (
          <>
        <Field label="Género">
          <select
            className={inputClass}
            value={displayForm.gender}
            onChange={(e) => set("gender", e.target.value)}
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
            value={displayForm.birthDate}
            onChange={(e) => set("birthDate", e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field label="Especialidad o perfil profesional">
          <select
            className={inputClass}
            value={displayForm.specialty}
            onChange={(e) => set("specialty", e.target.value)}
            disabled={
              specialtiesQuery.isLoading ||
              laborProfilesQuery.isLoading ||
              professionalProfiles.length === 0
            }
          >
            {specialtiesQuery.isLoading || laborProfilesQuery.isLoading ? (
              <option value="">Cargando perfiles…</option>
            ) : null}
            {!professionalProfiles.includes(displayForm.specialty) && displayForm.specialty ? (
              <option value={displayForm.specialty}>{displayForm.specialty}</option>
            ) : null}
            {medicalSpecialties.length > 0 ? (
              <optgroup label="Especialidades médicas">
                {medicalSpecialties.map((name) => (
                  <option key={`med-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {laborProfiles.length > 0 ? (
              <optgroup label="Técnico laboral">
                {laborProfiles.map((name) => (
                  <option key={`lab-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </Field>
        <Field
          label="Registro profesional"
          hint="Registro médico, tarjeta profesional o certificación técnica."
        >
          <input
            className={inputClass}
            value={displayForm.medicalRegistry}
            onChange={(e) => set("medicalRegistry", e.target.value)}
          />
        </Field>
        <Field label="Número de licencia">
          <input
            className={inputClass}
            value={displayForm.licenseNumber}
            onChange={(e) => set("licenseNumber", e.target.value)}
          />
        </Field>
        <Field label="Entidad educativa">
          <input
            className={inputClass}
            value={displayForm.educationEntity}
            onChange={(e) => set("educationEntity", e.target.value)}
          />
        </Field>
        <Field label="Institución de graduación">
          <input
            className={inputClass}
            value={displayForm.graduationInstitution}
            onChange={(e) => set("graduationInstitution", e.target.value)}
          />
        </Field>
          </>
        ) : null}
      </div>

      {!showCompany ? (
        <>
      <AddressLocationPicker
        showAdminFields
        value={{
          address: displayForm.address,
          lat: displayForm.lat,
          lng: displayForm.lng,
          city: displayForm.city,
          department: displayForm.department,
          country: displayForm.country,
          zip: displayForm.zip,
        }}
        onChange={(next) => {
          setForm((prev) =>
            prev
              ? {
                  ...prev,
                  address: next.address,
                  lat: next.lat,
                  lng: next.lng,
                  city: next.city ?? "",
                  department: next.department ?? "",
                  country: next.country ?? "",
                  zip: next.zip ?? "",
                }
              : prev,
          );
        }}
      />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Documentos</h2>
        <p className="text-xs text-muted-foreground">
          Cédula, registro profesional y diploma o certificado (PDF, JPG o PNG).
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <DocPreview
            title="Cédula"
            url={profile.cedulaDocUrl}
            fileKey={profile.cedulaDocKey}
            file={cedula}
            onChange={setCedula}
          />
          <DocPreview
            title="Registro profesional"
            url={profile.medicalRegistryDocUrl}
            fileKey={profile.medicalRegistryDocKey}
            file={medicalRegistryDoc}
            onChange={setMedicalRegistryDoc}
          />
          <DocPreview
            title="Diploma"
            url={profile.diplomaDocUrl}
            fileKey={profile.diplomaDocKey}
            file={diploma}
            onChange={setDiploma}
          />
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
  );
}
