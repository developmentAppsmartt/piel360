"use client";

import { useMemo } from "react";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";

interface CountryOption {
  iso2: string;
  callingCode: string;
  name: string;
}

/** Nombres de país en español sin traer un paquete de datos aparte —
 * `Intl.DisplayNames` ya viene en el navegador. */
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
    // Evita duplicados de indicativo en el <select> (ej. NANPA: US/CA/... = +1)
    // mostrando el nombre de cada país igual — el usuario elige por nombre.
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
  const options = useMemo(() => countryOptions(), []);
  // El indicativo puede repetirse entre varios países (ej. +1) — se
  // selecciona el primero que matchee para el value del <select>.
  const selectedIso2 =
    options.find((o) => o.callingCode === callingCode)?.iso2 ?? "";

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
      {selectedIso2 === "" && callingCode ? (
        <option value="">+{callingCode}</option>
      ) : null}
      {options.map((o) => (
        <option key={o.iso2} value={o.iso2}>
          {o.name} (+{o.callingCode})
        </option>
      ))}
    </select>
  );
}
