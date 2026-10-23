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
import { CatalogChecklist } from "@/components/shared/catalog-checklist";
import { ApiError } from "@/lib/api-error";
import type {
  SkinAgeRule,
  SkinAgeRuleInput,
  SkinAgeRulePriority,
} from "@/lib/queries/skin-age-rules";
import { useProducts } from "@/lib/queries/products";
import { useRoutines } from "@/lib/queries/routines";
import { useTreatments } from "@/lib/queries/treatments";
import {
  SCENARIOS,
  defaultForm,
  rangeError,
  toDifferences,
  type SkinAgeRuleFormState,
} from "@/lib/skin-age-rule-range";
import { SKIN_AGE_RULE_PRIORITY_OPTIONS } from "@/lib/skin-age-rules-ui";
import { cn } from "@/lib/utils";

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
  const [form, setForm] = useState<SkinAgeRuleFormState>(() => defaultForm(rule));
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
        imageUrl: product.imageUrl,
      })),
    [catalogProducts.data],
  );

  const supplementOptions = useMemo(
    () =>
      (catalogSupplements.data ?? []).map((product) => ({
        id: product.id,
        label: product.productName,
        hint: product.category?.categoryName ?? "Suplemento",
        imageUrl: product.imageUrl,
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
    const invalid = rangeError(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    const diff = toDifferences(form);

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

  const similar = form.scenario === "similar";

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
                  min={similar ? 0 : 1}
                  step={1}
                  value={form.fromYears}
                  disabled={similar}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fromYears: Number(event.target.value),
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-border px-3 disabled:bg-muted/40 disabled:text-muted-foreground"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">Hasta</span>
                <input
                  type="number"
                  min={similar ? 0 : 1}
                  step={1}
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
            {similar ? (
              <p className="text-xs text-muted-foreground">
                En edades similares el rango empieza en 0 años.
              </p>
            ) : null}
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
