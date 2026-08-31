"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { CloudUpload } from "lucide-react";
import {
  LocationPickerSection,
  useLocationPicker,
} from "@/components/auth/location-picker-section";
import { ApiError } from "@/lib/api-error";
import {
  useMyOrganization,
  useUpdateMyOrganization,
  useUploadOrganizationDocuments,
  type OrgCompanyProfile,
  type OrgCompanyProfileInput,
} from "@/lib/queries/organizations";

const EMPLOYEE_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501+",
] as const;

const DOC_TYPES = ["CC", "CE", "NIT", "PA"] as const;

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500 disabled:bg-muted";

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
  optional,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  optional?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground"> (opcional)</span>
        ) : null}
      </span>
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
      <p className="text-[11px] text-muted-foreground">
        PDF, JPG o PNG · máx. 10 MB
      </p>
    </div>
  );
}

function orgToForm(o: OrgCompanyProfile) {
  return {
    name: o.name ?? "",
    ciiuCode: o.ciiuCode ?? "",
    businessEmail: o.businessEmail ?? "",
    businessPhone: o.businessPhone ?? "",
    website: o.website ?? "",
    employeeCountRange: o.employeeCountRange ?? "",
    legalRepName: o.legalRepName ?? "",
    legalRepDocType: o.legalRepDocType ?? "CC",
    legalRepDocNumber: o.legalRepDocNumber ?? "",
  };
}

const TYPE_LABEL: Record<string, string> = {
  empresa: "Membresía empresa",
  empresa_aliada: "Empresa aliada",
};

export type CompanyProfileHandle = {
  /** Persiste datos y documentos de empresa. Lanza si falla. */
  save: () => Promise<void>;
  isReady: () => boolean;
};

export const CompanyProfileSection = forwardRef<CompanyProfileHandle>(
  function CompanyProfileSection(_props, ref) {
    const query = useMyOrganization(true);
    const mutation = useUpdateMyOrganization();
    const uploadDocs = useUploadOrganizationDocuments();
    const locationPicker = useLocationPicker();
    const hydratedOrgId = useRef<string | null>(null);
    const [form, setForm] = useState<ReturnType<typeof orgToForm> | null>(null);
    const [legalRepCedula, setLegalRepCedula] = useState<File | null>(null);
    const [rut, setRut] = useState<File | null>(null);
    const [existenceCert, setExistenceCert] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!query.data) return;
      setForm(orgToForm(query.data));
      if (hydratedOrgId.current !== query.data.id) {
        hydratedOrgId.current = query.data.id;
        locationPicker.hydrate({
          address: query.data.address,
          lat: toCoord(query.data.lat),
          lng: toCoord(query.data.lng),
        });
      }
    }, [query.data, locationPicker.hydrate]);

    useImperativeHandle(ref, () => ({
      isReady: () => Boolean(form) && !query.isLoading && !query.isError,
      save: async () => {
        if (!form) {
          throw new Error("No se encontró una organización asociada a tu cuenta.");
        }

        setError(null);

        if (!form.name.trim()) {
          const msg = "El nombre de la empresa es obligatorio.";
          setError(msg);
          throw new Error(msg);
        }

        const phone = digitsOnly(form.businessPhone);
        if (phone && !/^\d{10,15}$/.test(phone)) {
          const msg =
            "Teléfono empresarial inválido — usa solo dígitos (10 a 15).";
          setError(msg);
          throw new Error(msg);
        }

        if (!locationPicker.location) {
          const msg = "Marca la ubicación de la empresa en el mapa.";
          setError(msg);
          throw new Error(msg);
        }

        const payload: OrgCompanyProfileInput = {
          name: form.name.trim(),
          ciiuCode: form.ciiuCode.trim() || undefined,
          address:
            locationPicker.address.trim() ||
            locationPicker.addressQuery.trim() ||
            undefined,
          country: "CO",
          lat: locationPicker.location.lat,
          lng: locationPicker.location.lng,
          businessEmail: form.businessEmail.trim() || undefined,
          businessPhone: phone || undefined,
          website: form.website.trim() || undefined,
          employeeCountRange: form.employeeCountRange || undefined,
          legalRepName: form.legalRepName.trim() || undefined,
          legalRepDocType: form.legalRepDocType || undefined,
          legalRepDocNumber: form.legalRepDocNumber.trim() || undefined,
        };

        try {
          await mutation.mutateAsync(payload);

          if (legalRepCedula || rut || existenceCert) {
            const docs = new FormData();
            if (legalRepCedula) docs.set("legalRepCedula", legalRepCedula);
            if (rut) docs.set("rut", rut);
            if (existenceCert) docs.set("existenceCert", existenceCert);
            await uploadDocs.mutateAsync(docs);
            setLegalRepCedula(null);
            setRut(null);
            setExistenceCert(null);
          }
        } catch (err) {
          const msg =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "No se pudo guardar la información de empresa.";
          setError(msg);
          throw err instanceof Error ? err : new Error(msg);
        }
      },
    }));

    function set<K extends keyof NonNullable<typeof form>>(
      key: K,
      value: NonNullable<typeof form>[K],
    ) {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    }

    if (query.isPending) {
      return (
        <p className="text-sm text-muted-foreground">
          Cargando información de empresa…
        </p>
      );
    }

    if (query.isError || !query.data) {
      return (
        <p className="text-sm text-destructive">
          No se encontró una organización asociada a tu cuenta.
        </p>
      );
    }

    if (!form) {
      return (
        <p className="text-sm text-muted-foreground">
          Cargando información de empresa…
        </p>
      );
    }

    const org = query.data;
    const typeLabel = TYPE_LABEL[org.type] ?? org.type;

    return (
      <section className="space-y-6 rounded-2xl border border-border bg-card/40 p-5">
        <div>
          <h2 className="text-lg font-semibold">Información de la empresa</h2>
          <p className="text-sm text-muted-foreground">
            Datos comerciales de tu {typeLabel}. Completa o actualiza cuando
            cambien.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la empresa">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </Field>
          <Field label="Código CIIU principal">
            <input
              className={inputClass}
              value={form.ciiuCode}
              onChange={(e) => set("ciiuCode", e.target.value)}
              placeholder="Ej. 8621"
            />
          </Field>
          <Field label="Correo electrónico empresarial">
            <input
              className={inputClass}
              type="email"
              value={form.businessEmail}
              onChange={(e) => set("businessEmail", e.target.value)}
              placeholder="contacto@empresa.com"
            />
          </Field>
          <Field label="Teléfono de contacto">
            <input
              className={inputClass}
              type="tel"
              value={form.businessPhone}
              onChange={(e) => set("businessPhone", e.target.value)}
              placeholder="+57 300 000 0000"
            />
          </Field>
          <Field label="Sitio web" optional>
            <input
              className={inputClass}
              type="url"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="Número de empleados (aprox.)">
            <select
              className={inputClass}
              value={form.employeeCountRange}
              onChange={(e) => set("employeeCountRange", e.target.value)}
            >
              <option value="">Seleccionar</option>
              {EMPLOYEE_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <LocationPickerSection
          picker={locationPicker}
          title="Ubicación de la empresa"
          description="Busca la sede principal o marca el punto en el mapa."
        />

        <div>
          <h3 className="mb-3 text-sm font-semibold">Representante legal</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nombre completo">
              <input
                className={inputClass}
                value={form.legalRepName}
                onChange={(e) => set("legalRepName", e.target.value)}
              />
            </Field>
            <Field label="Tipo de documento">
              <select
                className={inputClass}
                value={form.legalRepDocType}
                onChange={(e) => set("legalRepDocType", e.target.value)}
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
                value={form.legalRepDocNumber}
                onChange={(e) => set("legalRepDocNumber", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Documentos requeridos</h3>
          <p className="text-xs text-muted-foreground">
            Cédula del representante, RUT y certificado de existencia y
            representación legal.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <DocPreview
              title="Cédula del representante legal"
              url={org.legalRepCedulaDocUrl}
              fileKey={org.legalRepCedulaDocKey}
              file={legalRepCedula}
              onChange={setLegalRepCedula}
            />
            <DocPreview
              title="RUT de la empresa"
              url={org.rutDocUrl}
              fileKey={org.rutDocKey}
              file={rut}
              onChange={setRut}
            />
            <DocPreview
              title="Certificado de existencia y representación legal"
              url={org.existenceCertDocUrl}
              fileKey={org.existenceCertDocKey}
              file={existenceCert}
              onChange={setExistenceCert}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>
    );
  },
);
