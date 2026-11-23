"use client";

import type { ChangeEvent } from "react";
import { CloudUpload } from "lucide-react";
import type { OrgCompanyProfile } from "@/lib/queries/organizations";

/** Piezas del perfil de empresa (Configuración → Cuenta): constantes, el
 * campo con etiqueta, la vista de documentos y el paso de la empresa al
 * formulario. */

export const EMPLOYEE_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501+",
] as const;

export const DOC_TYPES = ["CC", "CE", "NIT", "PA"] as const;

export const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500 disabled:bg-muted";

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function toCoord(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isPdfUrl(url: string | null | undefined, key: string | null | undefined) {
  const src = `${url ?? ""} ${key ?? ""}`.toLowerCase();
  return src.includes(".pdf");
}

export function Field({
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

export function DocPreview({
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

export function orgToForm(o: OrgCompanyProfile) {
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
    bankName: o.bankName ?? "",
    bankId: o.bankId ?? "",
    bankAccountType: o.bankAccountType ?? "AHORROS",
    bankAccountNumber: o.bankAccountNumber ?? "",
    payoutBeneficiaryName: o.payoutBeneficiaryName ?? "",
    payoutBeneficiaryEmail: o.payoutBeneficiaryEmail ?? "",
    payoutLegalIdType: o.payoutLegalIdType ?? "NIT",
    payoutLegalId: o.payoutLegalId ?? "",
  };
}

export const TYPE_LABEL: Record<string, string> = {
  empresa: "Membresía empresa",
  empresa_aliada: "Empresa aliada",
};
