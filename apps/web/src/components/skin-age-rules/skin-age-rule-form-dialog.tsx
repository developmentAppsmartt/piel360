"use client";

import { useMemo, useState } from "react";
import { Droplet, Sun } from "lucide-react";
import {
  ANALISIS_PIEL360_SKIN_TYPE_VALUES,
  FITZPATRICK_SCALES,
} from "@piel360/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import { FITZPATRICK_TYPES } from "@/lib/fitzpatrick-labels";
import type {
  SkinAgeRule,
  SkinAgeRuleInput,
  SkinAgeRulePriority,
} from "@/lib/queries/skin-age-rules";
import {
  SCENARIOS,
  defaultForm,
  formError,
  toDifferences,
  type SkinAgeRuleFormState,
} from "@/lib/skin-age-rule-range";
import { SKIN_AGE_RULE_PRIORITY_OPTIONS } from "@/lib/skin-age-rules-ui";
import { cn } from "@/lib/utils";
import { analisisPiel360SkinTypeLabel } from "@/lib/youcam-metric-labels";
import { RuleScopePicker } from "./rule-scope-picker";
import { SkinAgeRuleCatalogFields } from "./skin-age-rule-catalog-fields";

const SKIN_TYPE_OPTIONS = ANALISIS_PIEL360_SKIN_TYPE_VALUES.map((value) => ({
  value,
  label: analisisPiel360SkinTypeLabel(value),
}));

const FITZPATRICK_OPTIONS = FITZPATRICK_SCALES.map((scale) => ({
  value: scale,
  label: `${scale} · ${FITZPATRICK_TYPES[scale].label}`,
  colorHex: FITZPATRICK_TYPES[scale].colorHex,
}));

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

  const preview = useMemo(() => toDifferences(form), [form]);

  function patch(next: Partial<SkinAgeRuleFormState>) {
    setForm((current) => ({ ...current, ...next }));
  }

  async function handleSave() {
    setError(null);
    const invalid = formError(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    const diff = toDifferences(form);

    setSaving(true);
    try {
      await onSubmit({
        label: form.name.trim(),
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
        skinTypes: form.skinTypes ?? [],
        fitzpatrickScales: form.fitzpatrickScales ?? [],
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
            (resultado IA). Según esa diferencia, el biotipo y el fototipo se
            recomiendan productos, rutinas, tratamientos y suplementos ya creados.
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">
              Nombre de la regla <span className="text-destructive">*</span>
            </span>
            <input
              value={form.name}
              maxLength={120}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Ej. Antienvejecimiento para piel grasa"
              className="h-10 w-full rounded-xl border border-border px-3"
            />
          </label>

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
                  onChange={(event) => patch({ fromYears: Number(event.target.value) })}
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
                  onChange={(event) => patch({ toYears: Number(event.target.value) })}
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

          <section className="space-y-2">
            <p className="text-sm font-semibold">3. Biotipo y fototipo</p>
            <div className="grid gap-3 lg:grid-cols-2">
              <RuleScopePicker
                name="alcance-biotipo"
                icon={Droplet}
                title="Alcance por biotipo"
                hint="Aplica a todos los biotipos o solo a los que elijas."
                allLabel="Aplicar a todos los biotipos"
                specificLabel="Aplicar a biotipos específicos"
                options={SKIN_TYPE_OPTIONS}
                value={form.skinTypes}
                onChange={(skinTypes) => patch({ skinTypes })}
              />
              <RuleScopePicker
                name="alcance-fototipo"
                icon={Sun}
                title="Alcance por fototipo"
                hint="Aplica a todos los fototipos o solo a los que elijas."
                allLabel="Aplicar a todos los fototipos"
                specificLabel="Aplicar a fototipos específicos"
                options={FITZPATRICK_OPTIONS}
                value={form.fitzpatrickScales}
                onChange={(fitzpatrickScales) => patch({ fitzpatrickScales })}
              />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Prioridad</span>
              <select
                value={form.priority}
                onChange={(event) =>
                  patch({ priority: event.target.value as SkinAgeRulePriority })
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
                onChange={(event) => patch({ description: event.target.value })}
                placeholder={preview.description}
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </label>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold">
              4. Entonces recomendar (selecciona lo ya creado)
            </p>
            <SkinAgeRuleCatalogFields enabled={open} value={form} onChange={patch} />
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
