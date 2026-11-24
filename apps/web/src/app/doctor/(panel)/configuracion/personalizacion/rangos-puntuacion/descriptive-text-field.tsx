"use client";

import { Info, RotateCcw } from "lucide-react";
import { DESCRIPTIVE_TEXT_MAX_LENGTH } from "@piel360/shared";

/** Textarea con contador y «Restaurar»: lo comparten Biotipo y Fototipo. */
export function DescriptiveTextField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  /** El texto por defecto de PIEL 360. */
  fallback: string;
  /** `null` = volver al texto por defecto. */
  onChange: (value: string | null) => void;
}) {
  const isDefault = value.trim() === fallback;
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        maxLength={DESCRIPTIVE_TEXT_MAX_LENGTH}
        rows={4}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={isDefault}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/40 px-4 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Restaurar texto predeterminado
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {isDefault ? "Texto de PIEL 360 · " : ""}
          {value.length} / {DESCRIPTIVE_TEXT_MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}

export function NoScoreNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-primary/5 px-4 py-3 text-sm text-foreground/80">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
