"use client";

import { useEffect, useState } from "react";
import { searchAddresses, type AddressOption } from "@/lib/geocoding";

const MIN_QUERY = 3;
const DEBOUNCE_MS = 400;

/**
 * Sugerencias para lo que el usuario escribe. `query` es solo lo tecleado (no
 * la dirección que se llena al elegir o al marcar el mapa), así elegir no
 * vuelve a buscar. Las sugerencias se derivan de la última respuesta para esa
 * misma consulta: una respuesta vieja nunca pisa a una nueva.
 */
export function useAddressSearch(query: string) {
  const q = query.trim();
  const [results, setResults] = useState<{ query: string; options: AddressOption[] }>({
    query: "",
    options: [],
  });

  useEffect(() => {
    if (q.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchAddresses(q, controller.signal)
        .catch(() => [] as AddressOption[])
        .then((options) => {
          if (!controller.signal.aborted) setResults({ query: q, options });
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const active = q.length >= MIN_QUERY;
  return {
    options: active && results.query === q ? results.options : [],
    loading: active && results.query !== q,
  };
}
