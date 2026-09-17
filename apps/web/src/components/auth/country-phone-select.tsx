"use client";

import { useEffect, useMemo, useState } from "react";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";

interface CountryOption {
  iso2: string;
  callingCode: string;
  name: string;
}

/** Nombres de país en español — solo en cliente (Intl difiere Node vs browser). */
let regionNames: Intl.DisplayNames | null = null;
function countryName(iso2: string): string {
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames === "undefined") {
    return iso2;
  }
  regionNames ??= new Intl.DisplayNames(["es"], { type: "region" });
  return regionNames.of(iso2) ?? iso2;
}

function buildCountryOptions(): CountryOption[] {
  const options = getCountries()
    .map((iso2) => ({
      iso2,
      callingCode: getCountryCallingCode(iso2),
      name: countryName(iso2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const co = options.find((o) => o.iso2 === "CO");
  if (!co) return options;
  return [co, ...options.filter((o) => o.iso2 !== "CO")];
}

let cachedOptions: CountryOption[] | null = null;
function countryOptions(): CountryOption[] {
  cachedOptions ??= buildCountryOptions();
  return cachedOptions;
}

/** Placeholder estable SSR/hidratación (mismo HTML en server y 1.er paint). */
function stablePlaceholder(callingCode: string): {
  iso2: string;
  label: string;
} {
  if (callingCode === "57") {
    return { iso2: "CO", label: "Colombia (+57)" };
  }
  return { iso2: "", label: callingCode ? `+${callingCode}` : "País" };
}

/**
 * Selector de indicativo internacional — reemplaza el `<input>` de texto
 * libre que había en `PhoneSplitInputs`. Expone solo los dígitos del
 * indicativo (ej. "57"), igual que antes, para no tocar el resto de la
 * lógica de teléfono/OTP.
 */
export function CountryPhoneSelect({
  callingCode,
  onChange,
  disabled,
  className,
  id,
}: {
  /** Dígitos del indicativo, sin "+" (ej. "57"). */
  callingCode: string;
  onChange: (callingCode: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  // Lista completa solo tras mount: evita hydration mismatch por Intl.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  const options = useMemo(() => (ready ? countryOptions() : []), [ready]);
  const placeholder = stablePlaceholder(callingCode);

  const selectedIso2 = ready
    ? (options.find((o) => o.callingCode === callingCode)?.iso2 ?? "")
    : placeholder.iso2;

  return (
    <select
      id={id}
      className={className}
      value={selectedIso2}
      disabled={disabled}
      aria-label="País / indicativo telefónico"
      onChange={(e) => {
        const opt = options.find((o) => o.iso2 === e.target.value);
        if (opt) onChange(opt.callingCode);
      }}
    >
      {!ready ? (
        <option value={placeholder.iso2}>{placeholder.label}</option>
      ) : (
        <>
          {selectedIso2 === "" && callingCode ? (
            <option value="">+{callingCode}</option>
          ) : null}
          {options.map((o) => (
            <option key={o.iso2} value={o.iso2}>
              {o.name} (+{o.callingCode})
            </option>
          ))}
        </>
      )}
    </select>
  );
}
