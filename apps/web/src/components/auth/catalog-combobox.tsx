"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParameters, type Parameter } from "@/lib/queries/parameters";

const MAX_RESULTS = 50;

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(text: string): string {
  return text.normalize("NFD").replace(COMBINING_DIACRITICS, "").toLowerCase();
}

/**
 * Combobox liviano (input + lista filtrada) respaldado por un catálogo de
 * parámetros administrable (`/admin/configuracion`) — reemplaza los
 * `<input>` de texto libre de Entidad educativa / Institución de egreso /
 * Código CIIU. Solo permite dejar seleccionado un valor que exista en el
 * catálogo (no texto libre) — al perder foco sin seleccionar, revierte al
 * último valor válido.
 */
export function CatalogCombobox({
  typeSlug,
  value,
  onChange,
  onSelect,
  placeholder,
  disabled,
  className,
  id,
  required,
}: {
  typeSlug: string;
  /** Texto mostrado/controlado — debe ser el `label` de la opción elegida. */
  value: string;
  /** Se dispara con el `label` — suficiente cuando eso es todo lo que se
   * necesita guardar (ej. Entidad educativa). */
  onChange?: (label: string) => void;
  /** Se dispara con el parámetro completo — usar cuando además del label
   * hace falta el `code` (ej. Código CIIU). */
  onSelect?: (param: Parameter) => void;
  placeholder?: string;
  disabled?: boolean;
  className: string;
  id?: string;
  required?: boolean;
}) {
  const { data, isLoading } = useParameters(typeSlug);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [value]);

  const results = useMemo(() => {
    const options = data ?? [];
    const q = normalize(query.trim());
    const filtered = q
      ? options.filter((o) => normalize(o.label).includes(q))
      : options;
    return filtered.slice(0, MAX_RESULTS);
  }, [data, query]);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        className={className}
        type="text"
        autoComplete="off"
        required={required}
        disabled={disabled || isLoading}
        placeholder={isLoading ? "Cargando…" : placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery(value);
          }
        }}
      />
      {open && results.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
          {results.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-sky-50"
                onClick={() => {
                  onChange?.(opt.label);
                  onSelect?.(opt);
                  setQuery(opt.label);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && !isLoading && results.length === 0 ? (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 shadow-lg">
          Sin resultados.
        </div>
      ) : null}
    </div>
  );
}
