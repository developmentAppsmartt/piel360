"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScopeOption {
  value: string;
  label: string;
  /** Punto de color delante (los fototipos). */
  colorHex?: string;
}

/**
 * «Aplicar a todos / a uno o varios específicos» para un alcance de la regla
 * (biotipo o fototipo). `value` null = todos; [] = «específico» todavía sin
 * elegir ninguno, que el formulario no deja guardar.
 */
export function RuleScopePicker({
  name,
  icon: Icon,
  title,
  hint,
  allLabel,
  specificLabel,
  options,
  value,
  onChange,
}: {
  /** `name` de los radios: dos pickers en el mismo formulario no se pisan. */
  name: string;
  icon: LucideIcon;
  title: string;
  hint: string;
  allLabel: string;
  specificLabel: string;
  options: ScopeOption[];
  value: string[] | null;
  onChange: (value: string[] | null) => void;
}) {
  const specific = value !== null;

  function toggle(option: string) {
    const current = value ?? [];
    onChange(
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={name}
            checked={!specific}
            onChange={() => onChange(null)}
            className="size-4 accent-primary"
          />
          {allLabel}
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={name}
            checked={specific}
            onChange={() => onChange([])}
            className="size-4 accent-primary"
          />
          {specificLabel}
        </label>
      </div>

      {specific ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(option.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40",
                )}
              >
                {option.colorHex ? (
                  <span
                    className="size-3 rounded-full border border-black/10"
                    style={{ backgroundColor: option.colorHex }}
                    aria-hidden
                  />
                ) : null}
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
