"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import type {
  PlanCoverageCatalogEntry,
  PlanCoverageItem,
} from "@piel360/shared";
import {
  formatCoverageHtml,
  syncCoverageHtml,
  toggleCoverageItem,
} from "@piel360/shared";
import { SimpleRichTextEditor } from "@/components/ui/simple-rich-text-editor";
import { cn } from "@/lib/utils";

type PlanCoveragePickerProps = {
  title: string;
  subtitle: string;
  catalog: PlanCoverageCatalogEntry[];
  selected: PlanCoverageItem[];
  html: string;
  onChange: (next: { items: PlanCoverageItem[]; html: string }) => void;
  descriptionMax?: number;
};

export function PlanCoveragePicker({
  title,
  subtitle,
  catalog,
  selected,
  html,
  onChange,
  descriptionMax = 2000,
}: PlanCoveragePickerProps) {
  const selectedKeys = new Set(selected.map((s) => s.key));
  const editorHtml = html.trim() ? html : formatCoverageHtml(selected);

  // Si hay chips seleccionados pero el HTML aún no se persistió (p. ej. plan
  // viejo o el editor no llegó a emitir), genera y guarda la descripción.
  useEffect(() => {
    if (selected.length === 0) return;
    if (html.trim()) return;
    const generated = formatCoverageHtml(selected);
    if (!generated) return;
    onChange({ items: selected, html: generated });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo sembrar cuando falta html
  }, [selected, html]);

  function handleToggle(key: string) {
    const previous = selected;
    const nextItems = toggleCoverageItem(selected, catalog, key);
    const nextHtml = syncCoverageHtml(nextItems, previous, editorHtml);
    onChange({ items: nextItems, html: nextHtml });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((entry) => {
          const active = selectedKeys.has(entry.key);
          return (
            <button
              key={entry.key}
              type="button"
              aria-pressed={active}
              onClick={() => handleToggle(entry.key)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-2 text-left text-sm transition-colors",
                active
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              <span className="min-w-0 flex-1 truncate font-medium">
                {entry.label}
              </span>
              <span
                className={cn(
                  "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-muted/40 text-transparent",
                )}
                aria-hidden
              >
                <Check className="size-3 stroke-[3]" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          Descripción de las condiciones incluidas
        </p>
        <SimpleRichTextEditor
          value={editorHtml}
          onChange={(nextHtml) =>
            onChange({ items: selected, html: nextHtml })
          }
          placeholder="Selecciona condiciones para generar la descripción…"
          maxLength={descriptionMax}
          minHeight={Math.min(220, Math.max(120, selected.length * 28 + 48))}
        />
      </div>
    </div>
  );
}
