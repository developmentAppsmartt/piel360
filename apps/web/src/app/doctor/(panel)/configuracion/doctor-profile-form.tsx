"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CloudUpload } from "lucide-react";
import { AddressLocationPicker } from "@/components/maps";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import {
  useMyDoctorProfile,
  useUpdateMyDoctorProfile,
  useUploadDoctorDocuments,
  type DoctorProfileInput,
  type MyDoctorProfile,
} from "@/lib/queries/doctors";
import { useSpecialties } from "@/lib/queries/specialties";
import {
  CompanyProfileSection,
  type CompanyProfileHandle,
} from "./company-profile-section";

function isCompanyMembership(profile: MyDoctorProfile) {
  const type = (profile.membershipType ?? "").trim().toLowerCase();
  if (type === "empresa" || type === "empresa_aliada") return true;
  return Boolean(profile.empresa || profile.empresaReferida);
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
    phone: p.phone ?? "",
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
  const specialtiesQuery = useSpecialties();
  const specialties = specialtiesQuery.data?.map((item) => item.name) ?? [];
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

  useEffect(() => {
    if (query.data) setForm(profileToForm(query.data));
  }, [query.data]);

  function set<K extends keyof NonNullable<typeof form>>(
    key: K,
    value: NonNullable<typeof form>[K],
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setMessage(null);
    setError(null);

    const phone = digitsOnly(form.phone);
    if (phone && !/^\d{10,15}$/.test(phone)) {
      setError(
        "Celular inválido — usa solo dígitos, con indicativo de país (10 a 15).",
      );
      return;
    }

    const profile = query.data;
    const showCompany = profile ? isCompanyMembership(profile) : false;

    const payload: DoctorProfileInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: phone || undefined,
      docType: form.docType || undefined,
      docNumber: form.docNumber.trim() || undefined,
      gender: form.gender || undefined,
      birthDate: form.birthDate || undefined,
      specialty: form.specialty || undefined,
      medicalRegistry: form.medicalRegistry.trim() || undefined,
      licenseNumber: form.licenseNumber.trim() || undefined,
      educationEntity: form.educationEntity.trim() || undefined,
      graduationInstitution: form.graduationInstitution.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      department: form.department.trim() || undefined,
      country: form.country.trim() || undefined,
      zip: form.zip.trim() || undefined,
      ...(form.lat != null && form.lng != null
        ? { lat: form.lat, lng: form.lng }
        : {}),
    };

    setSavingAll(true);
    try {
      await mutation.mutateAsync(payload);

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
        setMessage("Perfil actualizado.");
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

  if (query.isLoading || !form) {
    return <p className="text-sm text-muted-foreground">Cargando perfil…</p>;
  }

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar tu perfil de médico.
      </p>
    );
  }

  const profile = query.data!;
  const saving =
    savingAll || mutation.isPending || uploadDocs.isPending;
  const showCompany = isCompanyMembership(profile);

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-8">
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil de médico</h1>
        <p className="text-sm text-muted-foreground">
          Puedes actualizar tus datos. El correo no se puede cambiar.
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
        <Field label="Correo" hint="Solo lectura">
          <input className={inputClass} value={form.email} disabled readOnly />
        </Field>
        <Field label="Celular">
          <input
            className={inputClass}
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+57 300 000 0000"
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
        <Field label="Género">
          <select
            className={inputClass}
            value={form.gender}
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
            value={form.birthDate}
            onChange={(e) => set("birthDate", e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field label="Especialidad">
          <select
            className={inputClass}
            value={form.specialty}
            onChange={(e) => set("specialty", e.target.value)}
            disabled={specialtiesQuery.isLoading || specialties.length === 0}
          >
            {specialtiesQuery.isLoading ? (
              <option value="">Cargando especialidades…</option>
            ) : null}
            {!specialties.includes(form.specialty) && form.specialty ? (
              <option value={form.specialty}>{form.specialty}</option>
            ) : null}
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Registro médico">
          <input
            className={inputClass}
            value={form.medicalRegistry}
            onChange={(e) => set("medicalRegistry", e.target.value)}
          />
        </Field>
        <Field label="Número de licencia">
          <input
            className={inputClass}
            value={form.licenseNumber}
            onChange={(e) => set("licenseNumber", e.target.value)}
          />
        </Field>
        <Field label="Entidad educativa">
          <input
            className={inputClass}
            value={form.educationEntity}
            onChange={(e) => set("educationEntity", e.target.value)}
          />
        </Field>
        <Field label="Institución de graduación">
          <input
            className={inputClass}
            value={form.graduationInstitution}
            onChange={(e) => set("graduationInstitution", e.target.value)}
          />
        </Field>
      </div>

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
          Cédula, registro médico y diploma (PDF, JPG o PNG).
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
            title="Registro médico"
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
      </div>

      {showCompany ? <CompanyProfileSection ref={companyRef} /> : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <Button type="submit" disabled={saving}>
        {saving
          ? "Guardando…"
          : showCompany
            ? "Guardar perfil y empresa"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}
