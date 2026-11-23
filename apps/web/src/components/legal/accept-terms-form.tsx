"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { apiClientFetch } from "@/lib/api-client";
import {
  LegalAcceptanceChecks,
  NO_LEGAL_CHECKS,
  legalChecksComplete,
  type LegalChecks,
} from "./legal-acceptance-checks";

/** «Aceptar y continuar»: guarda la aceptación y vuelve a donde iba. */
export function AcceptTermsForm({ next }: { next: string }) {
  const [checks, setChecks] = useState<LegalChecks>(NO_LEGAL_CHECKS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSaving(true);
    setError(null);
    try {
      await apiClientFetch("/legal/me/accept", {
        method: "POST",
        body: JSON.stringify({ terms: true, privacy: true }),
      });
      // Navegación completa: el proxy vuelve a leer el estado de la cuenta.
      window.location.href = next;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar tu aceptación. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <LegalAcceptanceChecks value={checks} onChange={setChecks} disabled={saving} error={error} />
      <Button
        type="button"
        className="w-full"
        disabled={!legalChecksComplete(checks) || saving}
        onClick={() => void accept()}
      >
        {saving ? "Guardando…" : "Aceptar y continuar"}
      </Button>
    </div>
  );
}
