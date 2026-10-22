import { Info } from "lucide-react";

/**
 * Recordatorio del diagnóstico que dejó el profesional, arriba del resultado
 * de la IA: es lo primero que tiene que ver el médico al volver a consultar
 * al paciente. Mismo texto que la tarjeta del móvil.
 */
export function ProfessionalOutcomeCard({
  kind,
  title,
  notes,
  icd,
}: {
  kind: "selected" | "corrected";
  title: string;
  notes?: string | null;
  icd?: string | null;
}) {
  return (
    <section
      aria-label="Diagnóstico del profesional"
      className="flex items-start gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Info className="size-5" />
      </span>
      <div className="min-w-0 space-y-1 border-l border-primary/30 pl-4">
        <p className="text-sm font-semibold text-primary">
          {kind === "corrected"
            ? "Diagnóstico corregido por el profesional"
            : "Diagnóstico seleccionado por el profesional"}
        </p>
        <p className="text-base font-semibold text-foreground">{title}</p>
        {notes?.trim() ? (
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {notes}
          </p>
        ) : null}
        {icd ? (
          <p className="text-xs text-muted-foreground">Código ICD: {icd}</p>
        ) : null}
      </div>
    </section>
  );
}
