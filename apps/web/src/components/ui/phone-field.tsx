"use client";

import { useState } from "react";
import PhoneInput, {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
  type Country,
} from "react-phone-number-input";
import es from "react-phone-number-input/locale/es";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

const DEFAULT_COUNTRY: Country = "CO";

/** Mismo aspecto que los inputs del panel: el contenedor lleva el borde y el
 * foco; el input del número va sin borde por dentro. */
const FIELD_CLASS =
  "flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 [&_.PhoneInputCountry]:shrink-0";
const NUMBER_CLASS = "h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground";

function countryOf(e164: string | undefined): Country | undefined {
  if (!e164) return undefined;
  try {
    return parsePhoneNumber(e164)?.country;
  } catch {
    return undefined;
  }
}

/** Sin número no se puede deducir el país: el primero con ese indicativo
 * (Colombia por defecto). */
function countryForCallingCode(code: string): Country {
  if (!code || code === "57") return DEFAULT_COUNTRY;
  return getCountries().find((c) => getCountryCallingCode(c) === code) ?? DEFAULT_COUNTRY;
}

/**
 * Teléfono con bandera e indicativo (`react-phone-number-input`), en E.164
 * (`+573001234567`). Colombia por defecto y nombres de país en español.
 */
export function PhoneField({
  value,
  onChange,
  id,
  disabled,
  required,
  placeholder = "300 123 4567",
  className,
}: {
  value: string;
  onChange: (e164: string) => void;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  // Un valor guardado sin «+» (solo dígitos con indicativo) también se muestra.
  const normalized = value && !value.startsWith("+") ? `+${value.replace(/\D/g, "")}` : value;
  return (
    <PhoneInput
      id={id}
      international={false}
      defaultCountry={countryOf(normalized) ?? DEFAULT_COUNTRY}
      labels={es}
      value={normalized || undefined}
      onChange={(next) => onChange(next ?? "")}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(FIELD_CLASS, disabled && "opacity-60", className)}
      numberInputProps={{ className: NUMBER_CLASS, required, autoComplete: "tel" }}
    />
  );
}

/**
 * La misma entrada para formularios que guardan el indicativo y el número
 * por separado (registros, perfil, paciente). Trabaja con el país elegido,
 * así que funciona también mientras el número está a medio escribir.
 */
export function SplitPhoneField({
  prefix,
  nationalNumber,
  onPrefixChange,
  onNationalChange,
  id,
  disabled,
  className,
}: {
  /** Indicativo sin «+» (ej. «57»). */
  prefix: string;
  nationalNumber: string;
  onPrefixChange: (value: string) => void;
  onNationalChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const prefixDigits = prefix.replace(/\D/g, "");
  const [country, setCountry] = useState<Country>(
    () => countryOf(`+${prefixDigits}${nationalNumber}`) ?? countryForCallingCode(prefixDigits),
  );
  const value = nationalNumber ? `+${prefixDigits || getCountryCallingCode(country)}${nationalNumber}` : undefined;

  return (
    <PhoneInput
      id={id}
      international={false}
      defaultCountry={country}
      country={country}
      onCountryChange={(next) => {
        const c = next ?? DEFAULT_COUNTRY;
        setCountry(c);
        onPrefixChange(getCountryCallingCode(c));
      }}
      labels={es}
      value={value}
      onChange={(next) => {
        const code = getCountryCallingCode(country);
        const digits = (next ?? "").replace(/\D/g, "");
        onPrefixChange(code);
        onNationalChange(digits.startsWith(code) ? digits.slice(code.length) : digits);
      }}
      disabled={disabled}
      placeholder="300 123 4567"
      className={cn(FIELD_CLASS, disabled && "opacity-60", className)}
      numberInputProps={{ className: NUMBER_CLASS, autoComplete: "tel-national" }}
    />
  );
}
