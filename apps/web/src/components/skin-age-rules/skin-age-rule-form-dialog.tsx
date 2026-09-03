"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FlaskConical,
  Layers3,
  Pill,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import type {
  SkinAgeRule,
  SkinAgeRuleColorKey,
  SkinAgeRuleInput,
  SkinAgeRulePriority,
} from "@/lib/queries/skin-age-rules";
import { useProducts } from "@/lib/queries/products";
import { useRoutines } from "@/lib/queries/routines";
import { useTreatments } from "@/lib/queries/treatments";
import {
  SKIN_AGE_RULE_PRIORITY_OPTIONS,
  formatSkinAgeDifferenceRange,
} from "@/lib/skin-age-rules-ui";
import { cn } from "@/lib/utils";

type Scenario = "younger" | "similar" | "older";

type FormState = {
  scenario: Scenario;
  fromYears: number;
  toYears: number;
  description: string;
  priority: SkinAgeRulePriority;
  colorKey: SkinAgeRuleColorKey;
  routineIds: string[];
  treatmentIds: string[];
  productGroupIds: string[];
  supplementGroupIds: string[];
};

const SCENARIOS: {
  value: Scenario;
  title: string;
  hint: string;
  colorKey: SkinAgeRuleColorKey;
}[] = [
  {
    value: "younger",
    title: "Piel más joven",
    hint: "Edad del análisis menor que la edad del paciente",
    colorKey: "green",
  },
  {
    value: "similar",
    title: "Edades similares",
    hint: "Edad del análisis cercana a la edad del paciente",
    colorKey: "orange",
  },
  {
    value: "older",
    title: "Piel más envejecida",
    hint: "Edad del análisis mayor que la edad del paciente",
    colorKey: "red",
  },
];

function scenarioFromDiff(min: number, max: number): Scenario {
  if (max < 0) return "younger";
  if (min > 0) return "older";
  return "similar";
}

function yearsFromDiff(min: number, max: number, scenario: Scenario) {
  if (scenario === "younger") {
    return {
      fromYears: Math.abs(Math.min(max, -1)),
      toYears: Math.abs(Math.max(min, -100)),
    };
  }
  if (scenario === "older") {
    return {
      fromYears: Math.max(min, 1),
      toYears: Math.max(max, 1),
    };
  }
  return {
    fromYears: Math.max(min, 0),
    toYears: Math.max(max, 0),
  };
}

function toDifferences(form: FormState): {
  minDifference: number;
  maxDifference: number;
  label: string;
  description: string;
  colorKey: SkinAgeRuleColorKey;
} {
  const from = Math.min(form.fromYears, form.toYears);
  const to = Math.max(form.fromYears, form.toYears);

  if (form.scenario === "younger") {
    const minDifference = -to;
    const maxDifference = -from;
    return {
      minDifference,
      maxDifference,
      label: formatSkinAgeDifferenceRange(minDifference, maxDifference),
      description:
        form.description.trim() ||
        `La edad de la piel (análisis) es ${from} a ${to} años menor que la edad del paciente.`,
      colorKey: form.colorKey || "green",
    };
  }

  if (form.scenario === "older") {
    const minDifference = from;
    const maxDifference = to;
    return {
      minDifference,
      maxDifference,
      label: formatSkinAgeDifferenceRange(minDifference, maxDifference),
      description:
        form.description.trim() ||
        `La edad de la piel (análisis) es ${from} a ${to} años mayor que la edad del paciente.`,
      colorKey: form.colorKey || "red",
    };
  }

  return {
    minDifference: from,
    maxDifference: to,
    label: formatSkinAgeDifferenceRange(from, to),
    description:
      form.description.trim() ||
      `La edad de la piel (análisis) se parece a la edad del paciente (diferencia ${from} a ${to} años).`,
    colorKey: form.colorKey || "orange",
  };
}

function defaultForm(rule?: SkinAgeRule | null): FormState {
  if (!rule) {
    return {
      scenario: "older",
      fromYears: 4,
      toYears: 7,
      description: "",
      priority: "high",
      colorKey: "amber",
      routineIds: [],
      treatmentIds: [],
      productGroupIds: [],
      supplementGroupIds: [],
    };
  }
  const scenario = scenarioFromDiff(rule.minDifference, rule.maxDifference);
  const years = yearsFromDiff(rule.minDifference, rule.maxDifference, scenario);
  return {
    scenario,
    fromYears: years.fromYears,
    toYears: years.toYears,
    description: rule.description ?? "",
    priority: rule.priority,
    colorKey: rule.colorKey,
    routineIds: rule.routineIds,
    treatmentIds: rule.treatmentIds,
    productGroupIds: rule.productGroupIds,
    supplementGroupIds: rule.supplementGroupIds,
  };
}

export function SkinAgeRuleFormDialog({
  open,
  rule,
  sortOrder,
  onClose,
  onSubmit,
}: {
  open: boolean;
  rule?: SkinAgeRule | null;
  sortOrder?: number;
  onClose: () => void;
  onSubmit: (input: SkinAgeRuleInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => defaultForm(rule));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const routines = useRoutines(open);
  const treatments = useTreatments(open ? { kind: "treatment" } : undefined);
  const catalogProducts = useProducts(undefined, "product", { enabled: open });
  const catalogSupplements = useProducts(undefined, "supplement", {
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setForm(defaultForm(rule));
      setError(null);
    }
  }, [open, rule]);

  const preview = useMemo(() => toDifferences(form), [form]);

  const productOptions = useMemo(
    () =>
      (catalogProducts.data ?? []).map((product) => ({
        id: product.id,
        label: product.productName,
        hint: product.category?.categoryName ?? "Producto",
      })),
    [catalogProducts.data],
  );

  const supplementOptions = useMemo(
    () =>
      (catalogSupplements.data ?? []).map((product) => ({
        id: product.id,
        label: product.productName,
        hint: product.category?.categoryName ?? "Suplemento",
      })),
    [catalogSupplements.data],
  );

  const routineOptions = useMemo(
    () =>
      (routines.data ?? []).map((routine) => ({
        id: routine.id,
        label: routine.name,
        hint: `${routine.steps.length} paso${routine.steps.length === 1 ? "" : "s"}`,
      })),
    [routines.data],
  );

  const treatmentOptions = useMemo(
    () =>
      (treatments.data ?? []).map((treatment) => ({
        id: treatment.id,
        label: treatment.name,
        hint: treatment.category?.categoryName ?? "Tratamiento",
      })),
    [treatments.data],
  );

  async function handleSave() {
    setError(null);
    if (form.fromYears < 0 || form.toYears < 0) {
      setError("Los años de diferencia deben ser 0 o mayores.");
      return;
    }
    const diff = toDifferences(form);
    if (diff.minDifference > diff.maxDifference) {
      setError("El rango de diferencia no es válido.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        label: diff.label,
        description: diff.description,
        minDifference: diff.minDifference,
        maxDifference: diff.maxDifference,
        priority: form.priority,
        colorKey: diff.colorKey,
        sortOrder,
        isActive: true,
        routineIds: form.routineIds,
        treatmentIds: form.treatmentIds,
        productGroupIds: form.productGroupIds,
        supplementGroupIds: form.supplementGroupIds,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la regla. Revisa que la API esté en ejecución.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] w-[min(96vw,56rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Editar regla de edad de piel" : "Nueva regla de edad de piel"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">
            Se compara la <strong className="text-foreground">edad del paciente</strong>{" "}
            (cronológica, según fecha de nacimiento) con la{" "}
            <strong className="text-foreground">edad de la piel del análisis</strong>{" "}
            (resultado IA). Según esa diferencia se recomiendan productos, rutinas,
            tratamientos y suplementos ya creados.
          </div>

          <section className="space-y-2">
            <p className="text-sm font-semibold">1. Escenario de comparación</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {SCENARIOS.map((scenario) => {
                const active = form.scenario === scenario.value;
                return (
                  <button
                    key={scenario.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        scenario: scenario.value,
                        colorKey: scenario.colorKey,
                        fromYears:
                          scenario.value === "similar"
                            ? 0
                            : Math.max(current.fromYears, 1),
                        toYears:
                          scenario.value === "similar"
                            ? Math.max(current.toYears, 0)
                            : Math.max(current.toYears, 1),
                      }))
                    }
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    <p className="text-sm font-semibold">{scenario.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{scenario.hint}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold">2. Rango de diferencia (años)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">Desde</span>
                <input
                  type="number"
                  min={0}
                  value={form.fromYears}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fromYears: Number(event.target.value),
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-border px-3"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">Hasta</span>
                <input
                  type="number"
                  min={0}
                  value={form.toYears}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      toYears: Number(event.target.value),
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-border px-3"
                />
              </label>
            </div>
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              Se activará cuando la diferencia sea{" "}
              <strong>{preview.label}</strong>.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Prioridad</span>
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as SkinAgeRulePriority,
                  }))
                }
                className="h-10 w-full rounded-xl border border-border px-3"
              >
                {SKIN_AGE_RULE_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium text-muted-foreground">
                Descripción clínica (opcional)
              </span>
              <textarea
                rows={2}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={preview.description}
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </label>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold">
              3. Entonces recomendar (selecciona lo ya creado)
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              <CatalogChecklist
                title="Productos"
                icon={FlaskConical}
                options={productOptions}
                selectedIds={form.productGroupIds}
                onChange={(ids) =>
                  setForm((current) => ({ ...current, productGroupIds: ids }))
                }
                emptyHint="Crea productos en el módulo Productos."
                loading={catalogProducts.isLoading}
              />
              <CatalogChecklist
                title="Rutinas"
                icon={CalendarDays}
                options={routineOptions}
                selectedIds={form.routineIds}
                onChange={(ids) =>
                  setForm((current) => ({ ...current, routineIds: ids }))
                }
                emptyHint="Crea rutinas en Rutinas y tratamientos."
                loading={routines.isLoading}
              />
              <CatalogChecklist
                title="Tratamientos"
                icon={Layers3}
                options={treatmentOptions}
                selectedIds={form.treatmentIds}
                onChange={(ids) =>
                  setForm((current) => ({ ...current, treatmentIds: ids }))
                }
                emptyHint="Crea tratamientos en Rutinas y tratamientos."
                loading={treatments.isLoading}
              />
              <CatalogChecklist
                title="Suplementos"
                icon={Pill}
                options={supplementOptions}
                selectedIds={form.supplementGroupIds}
                onChange={(ids) =>
                  setForm((current) => ({ ...current, supplementGroupIds: ids }))
                }
                emptyHint="Crea suplementos en el módulo Productos."
                loading={catalogSupplements.isLoading}
              />
            </div>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Guardando…" : rule ? "Guardar cambios" : "Crear regla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CatalogChecklist({
  title,
  icon: Icon,
  options,
  selectedIds,
  onChange,
  emptyHint,
  loading,
}: {
  title: string;
  icon: typeof FlaskConical;
  options: { id: string; label: string; hint: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyHint: string;
  loading?: boolean;
}) {
  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-primary" />
          {title}
        </p>
        <span className="text-xs text-muted-foreground">
          {selectedIds.length} seleccionado{selectedIds.length === 1 ? "" : "s"}
        </span>
      </div>
      {loading ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Cargando…</p>
      ) : options.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {options.map((option) => {
            const active = selectedIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggle(option.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30",
                )}
              >
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {option.hint}
                  </span>
                </span>
                <span
                  className={cn(
                    "size-4 shrink-0 rounded border",
                    active ? "border-primary bg-primary" : "border-muted-foreground/40",
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
