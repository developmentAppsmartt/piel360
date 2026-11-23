"use client";

import { ShieldCheck } from "lucide-react";
import type { AnalysisConsentText } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";

/** Consentimiento previo al análisis (dermatológico o estético): el texto
 * del cliente, la casilla y «Iniciar análisis». Sin la casilla no se avanza;
 * el envío lleva `consentAccepted` y el API guarda la fecha. */
export function AnalysisConsentStep({
  text,
  accepted,
  onAcceptedChange,
  onContinue,
}: {
  text: AnalysisConsentText;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onContinue: () => void;
}) {
  return (
    <ModuleCard className="space-y-4 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-foreground">{text.title}</h2>
      </div>
      {text.paragraphs.map((p) => (
        <p key={p} className="text-sm leading-relaxed text-muted-foreground">
          {p}
        </p>
      ))}
      <p className="text-sm leading-relaxed font-semibold text-foreground">{text.emphasis}</p>
      <label className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-primary"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
        />
        {text.checkLabel}
      </label>
      <Button type="button" disabled={!accepted} onClick={onContinue}>
        {text.button}
      </Button>
    </ModuleCard>
  );
}
