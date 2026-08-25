"use client";

import { useEffect, useRef } from "react";
import { useActiveSpecialties } from "@/lib/queries/specialties";

type SpecialtySelectProps = {
  id?: string;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Si el valor actual no está en el catálogo activo, se añade como opción. */
  includeValue?: string | null;
};

export function SpecialtySelect({
  id,
  className,
  value,
  onChange,
  required,
  includeValue,
}: SpecialtySelectProps) {
  const query = useActiveSpecialties();
  const names = (query.data ?? []).map((s) => s.name);
  const extras =
    includeValue && !names.includes(includeValue) ? [includeValue] : [];
  const options = [...names, ...extras];
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (query.isLoading || names.length === 0) return;
    if (!value) onChangeRef.current(names[0]);
  }, [query.isLoading, names, value]);

  return (
    <select
      id={id}
      className={className}
      value={value || options[0] || ""}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={query.isLoading || options.length === 0}
    >
      {query.isLoading ? (
        <option value="">Cargando…</option>
      ) : options.length === 0 ? (
        <option value="">Sin especialidades</option>
      ) : (
        options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))
      )}
    </select>
  );
}
