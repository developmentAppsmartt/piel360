import { Eye, EyeOff } from "lucide-react";
import { SplitPhoneField } from "@/components/ui/phone-field";

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

/** Celular con bandera e indicativo (`react-phone-number-input`) que guarda
 * el indicativo y el número por separado, como esperan los registros y el
 * perfil. `prefixId`, `inputClass` y `showSubLabels` se aceptan por
 * compatibilidad con las llamadas anteriores. */
export function PhoneSplitInputs({
  prefix,
  nationalNumber,
  disabled,
  onPrefixChange,
  onNationalChange,
  nationalId = "phoneNational",
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
  return (
    <SplitPhoneField
      id={nationalId}
      prefix={prefix}
      nationalNumber={nationalNumber}
      onPrefixChange={onPrefixChange}
      onNationalChange={(value) => onNationalChange(digitsOnly(value).slice(0, 12))}
      disabled={disabled}
      className={`h-11 max-w-sm ${className}`}
    />
  );
}

/** Ojito de mostrar/ocultar contraseña. Se apoya en que el input esté dentro
 * de un contenedor `relative` y lleve `pr-11`. */
export function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute top-0 right-3 flex h-11 items-center text-slate-400 hover:text-slate-600"
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
    >
      {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}
