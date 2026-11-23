"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-error";
import { apiClientFetch } from "@/lib/api-client";

export type AlliedReferral = { code: string; organizationName: string };

type Lookup = { code: string; referral: AlliedReferral | null; error: string | null };

/** Valida el código de empresa aliada de la URL (`?ref=`) de los registros.
 * La carga se deriva de si ya hay respuesta para ese código: sin estados
 * sincronizados dentro del efecto. */
export function useAlliedReferral(initialCode: string | undefined) {
  const code = initialCode?.trim() ?? "";
  const [lookup, setLookup] = useState<Lookup | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void apiClientFetch<AlliedReferral>(`/auth/referral/${encodeURIComponent(code)}`)
      .then((data) => {
        if (!cancelled) {
          setLookup({ code, referral: { code: data.code, organizationName: data.organizationName }, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLookup({
            code,
            referral: null,
            error: err instanceof ApiError ? err.message : "Código de empresa aliada no válido.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const current = lookup?.code === code ? lookup : null;
  const referral = current?.referral ?? null;
  return {
    referral,
    loading: Boolean(code) && !current,
    error: current?.error ?? null,
    /** El código pedido en la URL todavía no se validó. */
    pending: Boolean(code) && !referral,
    code: referral?.code || code || undefined,
  };
}
