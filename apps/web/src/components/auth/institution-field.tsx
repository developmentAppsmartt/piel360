"use client";

import { useState } from "react";
import { CatalogCombobox } from "@/components/auth/catalog-combobox";
import { Field, inputClass } from "@/components/auth/auth-form-primitives";
import { useParameters } from "@/lib/queries/parameters";

/** Longitud de cortesía para el texto libre: evita pegar párrafos enteros. */
const MAX_OTHER_LENGTH = 150;

/**
 * Campo de institución educativa: buscador sobre el catálogo de `parameters`
 * con una salida de emergencia para quien no encuentre la suya.
 *
 * `CatalogCombobox` solo admite valores del catálogo —al perder el foco sin
 * elegir opción revierte al último válido—, así que sin esto una institución
 * que falte en el catálogo bloquea el registro. Al marcar la casilla el campo
 * pasa a texto libre, que es lo que estas columnas ya guardaban desde el perfil.
 *
 * Los dos modos escriben en el mismo `value`: quien usa el componente no se
 * entera del modo y su validación sigue siendo la de siempre.
 */
export function InstitutionField({
  label,
  otherLabel,
  typeSlug,
  value,
  onChange,
  placeholder,
  otherPlaceholder = "Escribe el nombre completo de la institución",
  required,
  disabled,
}: {
  label: string;
  /** Etiqueta del campo de texto libre, p. ej. "Otra institución de pregrado". */
  otherLabel: string;
  typeSlug: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  otherPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const { data } = useParameters(typeSlug);
  /** `null` mientras el usuario no toque la casilla: manda lo que diga el valor. */
  const [manual, setManual] = useState<boolean | null>(null);

  // Un valor que no esté en el catálogo solo puede venir de texto libre (los
  // perfiles antiguos lo tienen), así que el campo abre ya en modo "otra" para
  // no perderlo: el combobox lo borraría al primer blur. Se deriva en vez de
  // usar un efecto para no pelearse con lo que el usuario ya haya elegido.
  const inCatalog = data?.some((option) => option.label === value.trim()) ?? false;
  const other = manual ?? (Boolean(value.trim()) && data != null && !inCatalog);

  function toggle(checked: boolean) {
    setManual(checked);
    // Cambiar de modo limpia el valor: si no, al marcar la casilla se enviaría
    // el nombre del catálogo como si fuera escrito a mano, y al desmarcarla el
    // combobox arrastraría un texto que no existe en el catálogo.
    onChange("");
  }

  return (
    <div className="flex flex-col gap-2">
      {other ? (
        <Field label={otherLabel} required={required}>
          <input
            className={inputClass}
            type="text"
            autoComplete="off"
            required={required}
            disabled={disabled}
            maxLength={MAX_OTHER_LENGTH}
            placeholder={otherPlaceholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      ) : (
        <Field label={label} required={required}>
          <CatalogCombobox
            typeSlug={typeSlug}
            className={inputClass}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
          />
        </Field>
      )}

      {/* La casilla va fuera del <label> de Field: anidar labels haría que al
          pulsarla se enfocara también el campo de arriba. */}
      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          className="size-4 rounded border-zinc-300 text-sky-500 focus:ring-sky-400/30"
          checked={other}
          disabled={disabled}
          onChange={(e) => toggle(e.target.checked)}
        />
        No encuentro mi institución
      </label>
    </div>
  );
}
