"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/auth/text-field";
import { ApiError } from "@/lib/api-error";
import type { ConfirmAnalysisInput } from "@/lib/queries/analyses";

const MISSING_NOTES_ERROR =
  "Describe el diagnóstico en observaciones antes de guardar.";

export function ConfirmAnalysisForm({
  aiDiagnosis,
  onSubmit,
  /** Análisis dermatológico: las observaciones del médico se piden siempre,
   * tanto al confirmar como al corregir (mismo criterio que la app móvil). */
  requireNotes = false,
  initialNotes = "",
  startCorrecting = false,
  onCancel,
}: {
  aiDiagnosis: string | null;
  onSubmit: (input: ConfirmAnalysisInput) => Promise<unknown>;
  requireNotes?: boolean;
  initialNotes?: string;
  startCorrecting?: boolean;
  onCancel?: () => void;
}) {
  const [correcting, setCorrecting] = useState(startCorrecting);
  const [finalDiagnosis, setFinalDiagnosis] = useState(aiDiagnosis ?? "");
  const [doctorNotes, setDoctorNotes] = useState(initialNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** `true` cuando faltan observaciones obligatorias; deja el mensaje puesto. */
  function missingNotes() {
    if (requireNotes && !doctorNotes.trim()) {
      setError(MISSING_NOTES_ERROR);
      return true;
    }
    return false;
  }

  async function handleConfirm() {
    setError(null);
    if (missingNotes()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        isCorrected: false,
        doctorNotes: doctorNotes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo confirmar el análisis.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCorrect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (missingNotes()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        isCorrected: true,
        finalDiagnosis,
        doctorNotes: doctorNotes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la corrección.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    setCorrecting(false);
    setError(null);
    onCancel?.();
  }

  const notesField = (
    <div className="space-y-2">
      <label htmlFor="doctorNotes" className="text-sm font-medium">
        Observaciones{requireNotes ? "" : " (opcional)"}
      </label>
      <textarea
        id="doctorNotes"
        value={doctorNotes}
        onChange={(e) => setDoctorNotes(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Describe el diagnóstico del médico"
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <p className="text-right text-xs text-muted-foreground">
        {doctorNotes.length}/500
      </p>
    </div>
  );

  if (!correcting) {
    return (
      <div className="space-y-4">
        {/* En dermatológico el campo se ve siempre: el médico deja su
            observación tanto si confirma el resultado como si lo corrige. */}
        {requireNotes ? notesField : null}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" disabled={isSubmitting} onClick={handleConfirm}>
            {isSubmitting ? "Guardando..." : "Confirmar resultado"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setCorrecting(true)}>
            Corregir resultado
          </Button>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={handleCancel}>
              Cancelar
            </Button>
          ) : null}
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
      {notesField}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar corrección"}
        </Button>
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
