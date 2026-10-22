"use client";

import { useState } from "react";
import { DoctorNotesField } from "@/components/analyses/doctor-notes-field";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import type { AnalysisDetail, ConfirmAnalysisInput } from "@/lib/queries/analyses";

/** El diagnóstico de apoyo que el profesional eligió en la lista. */
export type SupportChoice = { label: string; code: string | null };

/**
 * Confirmar el diagnóstico de apoyo elegido, o abrir «Corregir resultado».
 * Ya confirmado, deja editar las observaciones sin cambiar el diagnóstico.
 */
export function DermaDiagnosisActions({
  analysis,
  choice,
  onCorrect,
  onSubmit,
}: {
  analysis: AnalysisDetail;
  choice: SupportChoice | null;
  onCorrect: () => void;
  onSubmit: (input: ConfirmAnalysisInput) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(analysis.doctorNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(input: ConfirmAnalysisInput) {
    setError(null);
    if (!notes.trim()) {
      setError("Describe el diagnóstico en observaciones antes de guardar.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ ...input, doctorNotes: notes.trim() });
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  function confirmChoice() {
    if (!choice) {
      setError("Elige uno de los diagnósticos de apoyo antes de confirmar.");
      return;
    }
    void submit({
      isCorrected: false,
      finalDiagnosis: choice.label,
      finalDiagnosisCode: choice.code ?? undefined,
    });
  }

  /** Mismo diagnóstico que ya tiene el registro; solo cambian las notas. */
  function saveNotes() {
    void submit({
      isCorrected: analysis.isCorrected,
      finalDiagnosis: analysis.finalDiagnosis ?? undefined,
      finalDiagnosisCode: analysis.finalDiagnosisCode ?? undefined,
    });
  }

  if (analysis.isConfirmed && !editing) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setEditing(true)}>
          Editar observaciones
        </Button>
        <Button type="button" variant="outline" onClick={onCorrect}>
          Corregir resultado
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DoctorNotesField value={notes} onChange={setNotes} required disabled={saving} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button type="button" onClick={saveNotes} disabled={saving}>
              {saving ? "Guardando..." : "Guardar observaciones"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button type="button" onClick={confirmChoice} disabled={saving}>
              {saving ? "Guardando..." : "Confirmar resultado"}
            </Button>
            <Button type="button" variant="outline" onClick={onCorrect} disabled={saving}>
              Corregir resultado
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
