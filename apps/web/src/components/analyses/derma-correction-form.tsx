"use client";

import { useState } from "react";
import type { NosologyCategory, NosologyItem } from "@piel360/shared";
import { DoctorNotesField } from "@/components/analyses/doctor-notes-field";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import type { ConfirmAnalysisInput } from "@/lib/queries/analyses";

export type NosologyChoice = { item: NosologyItem; category: NosologyCategory };

/** Segundo paso de «Corregir resultado»: la condición elegida en la lista y
 * las observaciones, que en dermatológico son obligatorias. */
export function DermaCorrectionForm({
  choice,
  initialNotes,
  onChangeChoice,
  onCancel,
  onSubmit,
}: {
  choice: NosologyChoice;
  initialNotes: string;
  onChangeChoice: () => void;
  onCancel: () => void;
  onSubmit: (input: ConfirmAnalysisInput) => Promise<unknown>;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!notes.trim()) {
      setError("Describe el diagnóstico en observaciones antes de guardar.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        isCorrected: true,
        finalDiagnosis: choice.item.name,
        finalDiagnosisCode: choice.item.id,
        doctorNotes: notes.trim(),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la corrección.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{choice.category.name}</p>
          <p className="text-sm font-semibold">{choice.item.name}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onChangeChoice} disabled={saving}>
          Cambiar
        </Button>
      </div>
      <DoctorNotesField value={notes} onChange={setNotes} required disabled={saving} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Guardando..." : "Guardar diagnóstico"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
