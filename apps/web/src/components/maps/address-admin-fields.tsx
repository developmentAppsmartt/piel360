"use client";

import type { AddressLocationValue } from "./address-location-picker";

const FIELDS: { key: "city" | "department" | "country" | "zip"; label: string }[] = [
  { key: "city", label: "Municipio / ciudad" },
  { key: "department", label: "Departamento" },
  { key: "country", label: "País" },
  { key: "zip", label: "Código postal" },
];

/** Ciudad, departamento, país y CP: se llenan solos al elegir la dirección y
 * se pueden corregir a mano. */
export function AddressAdminFields({
  value,
  onChange,
  inputClass,
}: {
  value: AddressLocationValue;
  onChange: (next: AddressLocationValue) => void;
  inputClass: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {FIELDS.map(({ key, label }) => (
        <label key={key} className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{label}</span>
          <input
            className={inputClass}
            value={value[key] ?? ""}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}
