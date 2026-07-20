"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/auth/text-field";
import { ApiError } from "@/lib/api-error";
import type { ConfirmAnalysisInput } from "@/lib/queries/analyses";

export function ConfirmAnalysisForm({
  aiDiagnosis,
  onSubmit,
}: {
  aiDiagnosis: string | null;
  onSubmit: (input: ConfirmAnalysisInput) => Promise<unknown>;
}) {
  const [correcting, setCorrecting] = useState(false);
  const [finalDiagnosis, setFinalDiagnosis] = useState(aiDiagnosis ?? "");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ isCorrected: false });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo confirmar el análisis.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCorrect(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ isCorrected: true, finalDiagnosis, doctorNotes });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la corrección.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!correcting) {
    return (
      <div className="space-y-2">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" disabled={isSubmitting} onClick={handleConfirm}>
            {isSubmitting ? "Guardando..." : "Confirmar resultado"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setCorrecting(true)}>
            Corregir resultado
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleCorrect} className="space-y-4">
      <TextField
        label="Diagnóstico final"
        id="finalDiagnosis"
        value={finalDiagnosis}
        onChange={(e) => setFinalDiagnosis(e.target.value)}
        required
      />
      <div className="space-y-2">
        <label htmlFor="doctorNotes" className="text-sm font-medium">
          Notas del doctor
        </label>
        <textarea
          id="doctorNotes"
          value={doctorNotes}
          onChange={(e) => setDoctorNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar corrección"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setCorrecting(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
