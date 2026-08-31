export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Mismo criterio que la API al validar tickets OTP de teléfono. */
export function normalizePhoneDigits(value: string) {
  return digitsOnly(value);
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function Field({
  label,
  children,
  required,
  hint,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  optional?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-zinc-900">
      <span className="font-medium">
        {label}
        {required ? (
          <span className="text-red-500"> *</span>
        ) : optional ? (
          <span className="font-normal text-zinc-400"> (opcional)</span>
        ) : null}
      </span>
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-sky-500 disabled:bg-zinc-50";
