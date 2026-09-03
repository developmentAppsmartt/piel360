export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Mismo criterio que la API al validar tickets OTP de teléfono. */
export function normalizePhoneDigits(value: string) {
  return digitsOnly(value);
}

/** Prefijo país (sin +) + número nacional → dígitos para OTP/registro. */
export function combinePhoneParts(prefix: string, nationalNumber: string) {
  return `${digitsOnly(prefix)}${digitsOnly(nationalNumber)}`;
}

export function isValidE164Digits(phone: string) {
  return /^\d{10,15}$/.test(phone);
}

/** Separa dígitos E.164 en prefijo país + número nacional (default +57). */
export function splitPhoneDigits(full: string): {
  prefix: string;
  national: string;
} {
  const digits = digitsOnly(full);
  if (!digits) return { prefix: "57", national: "" };
  if (digits.startsWith("57") && digits.length >= 12) {
    return { prefix: "57", national: digits.slice(2) };
  }
  // Celular colombiano guardado sin indicativo (10 dígitos, empieza en 3).
  if (digits.length === 10 && digits.startsWith("3")) {
    return { prefix: "57", national: digits };
  }
  if (digits.length >= 11) {
    return { prefix: digits.slice(0, 2), national: digits.slice(2) };
  }
  return { prefix: "57", national: digits };
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

/** Prefijo (+57) + número, mismo estilo de inputs de registro. */
export function PhoneSplitInputs({
  prefix,
  nationalNumber,
  disabled,
  onPrefixChange,
  onNationalChange,
  prefixId = "phonePrefix",
  nationalId = "phoneNational",
  inputClass: fieldInputClass = inputClass,
  showSubLabels = false,
  className = "",
}: {
  prefix: string;
  nationalNumber: string;
  disabled?: boolean;
  onPrefixChange: (value: string) => void;
  onNationalChange: (value: string) => void;
  prefixId?: string;
  nationalId?: string;
  inputClass?: string;
  showSubLabels?: boolean;
  className?: string;
}) {
  const prefixControl = (
    <div className="relative w-[5.5rem] shrink-0">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        +
      </span>
      <input
        id={prefixId}
        className={`${fieldInputClass} w-full pl-6`}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-country-code"
        placeholder="57"
        value={prefix}
        disabled={disabled}
        maxLength={4}
        aria-label="Prefijo de país"
        onChange={(e) => onPrefixChange(digitsOnly(e.target.value).slice(0, 4))}
      />
    </div>
  );

  const nationalControl = (
    <input
      id={nationalId}
      className={`${fieldInputClass} min-w-0 flex-1`}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="3000000000"
      value={nationalNumber}
      disabled={disabled}
      aria-label="Número de celular"
      onChange={(e) =>
        onNationalChange(digitsOnly(e.target.value).slice(0, 12))
      }
    />
  );

  if (showSubLabels) {
    return (
      <div className={`flex w-full items-end gap-2 ${className}`}>
        <div className="flex w-[5.5rem] shrink-0 flex-col gap-1">
          <span className="text-[11px] font-normal leading-none text-muted-foreground">
            Indicativo
          </span>
          {prefixControl}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[11px] font-normal leading-none text-muted-foreground">
            Número
          </span>
          {nationalControl}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full max-w-sm items-center gap-2 ${className}`}>
      {prefixControl}
      {nationalControl}
    </div>
  );
}