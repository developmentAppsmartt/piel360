"use client";

import { PRIVACY_CHECK_LABEL, TERMS_CHECK_LABEL } from "@piel360/shared";

export type LegalChecks = { terms: boolean; privacy: boolean };

export const NO_LEGAL_CHECKS: LegalChecks = { terms: false, privacy: false };

export function legalChecksComplete(value: LegalChecks): boolean {
  return value.terms && value.privacy;
}

/** Las dos casillas obligatorias del registro y de la pantalla de aceptación,
 * con los documentos en otra pestaña para no perder lo escrito. */
export function LegalAcceptanceChecks({
  value,
  onChange,
  disabled,
  error,
}: {
  value: LegalChecks;
  onChange: (next: LegalChecks) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const row = (key: keyof LegalChecks, label: string, href: string, linkText: string) => (
    <label className="flex items-start gap-2.5 text-sm leading-snug text-foreground">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-primary"
        checked={value[key]}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
      />
      <span>
        {label}{" "}
        <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
          {linkText}
        </a>
      </span>
    </label>
  );

  return (
    <fieldset className="space-y-2.5 rounded-xl border border-border bg-muted/30 p-4">
      <legend className="sr-only">Términos y política de datos</legend>
      {row("terms", TERMS_CHECK_LABEL, "/terminos", "Leer términos")}
      {row("privacy", PRIVACY_CHECK_LABEL, "/privacidad", "Leer política")}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
