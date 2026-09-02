"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  FlaskConical,
  Layers3,
  Pill,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SkinAgeRule } from "@/lib/queries/skin-age-rules";
import {
  SKIN_AGE_RULE_COLOR_STYLES,
  SKIN_AGE_RULE_PRIORITY_OPTIONS,
  formatSkinAgeDifferenceRange,
  priorityLabel,
} from "@/lib/skin-age-rules-ui";
import {
  SkinAgeRuleLinkPickerDialog,
  type LinkPickerKind,
} from "./skin-age-rule-link-picker";
import { cn } from "@/lib/utils";

type SkinAgeRuleCardProps = {
  rule: SkinAgeRule;
  onUpdate: (patch: Partial<SkinAgeRule>) => Promise<void>;
  onDelete: () => Promise<void>;
  saving?: boolean;
};

export function SkinAgeRuleCard({
  rule,
  onUpdate,
  onDelete,
  saving,
}: SkinAgeRuleCardProps) {
  const [draft, setDraft] = useState(rule);
  const [pickerKind, setPickerKind] = useState<LinkPickerKind | null>(null);

  useEffect(() => {
    setDraft(rule);
  }, [rule]);

  const colors = SKIN_AGE_RULE_COLOR_STYLES[draft.colorKey];

  async function commit(patch: Partial<SkinAgeRule>) {
    setDraft((current) => ({ ...current, ...patch }));
    await onUpdate(patch);
  }

  const linkButtons: {
    kind: LinkPickerKind;
    label: string;
    icon: typeof CalendarDays;
    ids: string[];
    field: keyof Pick<
      SkinAgeRule,
      "routineIds" | "treatmentIds" | "productGroupIds" | "supplementGroupIds"
    >;
  }[] = [
    {
      kind: "products",
      label: "Productos",
      icon: FlaskConical,
      ids: draft.productGroupIds,
      field: "productGroupIds",
    },
    {
      kind: "routines",
      label: "Rutinas",
      icon: CalendarDays,
      ids: draft.routineIds,
      field: "routineIds",
    },
    {
      kind: "treatments",
      label: "Tratamientos",
      icon: Layers3,
      ids: draft.treatmentIds,
      field: "treatmentIds",
    },
    {
      kind: "supplements",
      label: "Suplementos",
      icon: Pill,
      ids: draft.supplementGroupIds,
      field: "supplementGroupIds",
    },
  ];

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex">
          <div className={cn("w-1.5 shrink-0", colors.bar)} aria-hidden />
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  SI
                </p>
                <p className={cn("text-base font-semibold", colors.text)}>
                  Diferencia{" "}
                  {formatSkinAgeDifferenceRange(
                    draft.minDifference,
                    draft.maxDifference,
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {draft.description ?? "Sin descripción clínica."}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => void onDelete()}
                disabled={saving}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Mínimo (años)">
                <input
                  type="number"
                  value={draft.minDifference}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      minDifference: Number(event.target.value),
                    }))
                  }
                  onBlur={() => void commit({ minDifference: draft.minDifference })}
                  className="h-9 w-full rounded-lg border border-border px-3 text-sm"
                />
              </Field>
              <Field label="Máximo (años)">
                <input
                  type="number"
                  value={draft.maxDifference}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      maxDifference: Number(event.target.value),
                    }))
                  }
                  onBlur={() => void commit({ maxDifference: draft.maxDifference })}
                  className="h-9 w-full rounded-lg border border-border px-3 text-sm"
                />
              </Field>
              <Field label="Prioridad">
                <select
                  value={draft.priority}
                  onChange={(event) =>
                    void commit({
                      priority: event.target.value as SkinAgeRule["priority"],
                    })
                  }
                  className="h-9 w-full rounded-lg border border-border px-3 text-sm"
                >
                  {SKIN_AGE_RULE_PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estado">
                <select
                  value={draft.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    void commit({ isActive: event.target.value === "active" })
                  }
                  className="h-9 w-full rounded-lg border border-border px-3 text-sm"
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Descripción clínica">
                <textarea
                  value={draft.description ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  onBlur={() => void commit({ description: draft.description ?? "" })}
                  rows={2}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </Field>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Entonces recomendar
              </p>
              <div className="flex flex-wrap gap-2">
                {linkButtons.map((button) => {
                  const Icon = button.icon;
                  const active = button.ids.length > 0;
                  return (
                    <button
                      key={button.kind}
                      type="button"
                      onClick={() => setPickerKind(button.kind)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {button.label}
                      {active ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                          {button.ids.length}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Prioridad actual: {priorityLabel(draft.priority)}
              </p>
            </div>
          </div>
        </div>
      </article>

      {pickerKind ? (
        <SkinAgeRuleLinkPickerDialog
          kind={pickerKind}
          open
          selectedIds={
            pickerKind === "routines"
              ? draft.routineIds
              : pickerKind === "treatments"
                ? draft.treatmentIds
                : pickerKind === "products"
                  ? draft.productGroupIds
                  : draft.supplementGroupIds
          }
          onClose={() => setPickerKind(null)}
          onSave={(ids) => {
            const field =
              pickerKind === "routines"
                ? "routineIds"
                : pickerKind === "treatments"
                  ? "treatmentIds"
                  : pickerKind === "products"
                    ? "productGroupIds"
                    : "supplementGroupIds";
            void commit({ [field]: ids });
          }}
        />
      ) : null}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
