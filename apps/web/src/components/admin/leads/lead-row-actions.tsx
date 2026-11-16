"use client";

import { useState } from "react";
import { LEAD_STATUSES, type LeadStatus } from "@piel360/shared";
import { useUpdateLead, type AdminLead } from "@/lib/queries/admin-leads";

/** Estado y notas de un lead. El estado se guarda al cambiarlo; las notas al
 * salir del campo, solo si cambiaron. */
export function LeadRowActions({ lead }: { lead: AdminLead }) {
  const update = useUpdateLead();
  const [notes, setNotes] = useState(lead.notes ?? "");

  return (
    <div className="space-y-2">
      <select
        aria-label={`Estado del lead de ${lead.name}`}
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
        value={lead.status}
        disabled={update.isPending}
        onChange={(e) => update.mutate({ id: lead.id, status: e.target.value as LeadStatus })}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <textarea
        aria-label={`Notas del lead de ${lead.name}`}
        placeholder="Notas"
        rows={2}
        maxLength={4000}
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          if (notes !== (lead.notes ?? "")) update.mutate({ id: lead.id, notes });
        }}
      />
      {update.isError ? <p className="text-xs text-destructive">No se pudo guardar.</p> : null}
    </div>
  );
}
