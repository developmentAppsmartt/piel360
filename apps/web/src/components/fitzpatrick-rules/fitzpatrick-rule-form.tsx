"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FlaskConical,
  Layers3,
  Pill,
} from "lucide-react";
import type { FitzpatrickScale } from "@piel360/shared";
import { FITZPATRICK_SCALES } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardDescription, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { FITZPATRICK_TYPES } from "@/lib/fitzpatrick-labels";
import { FITZPATRICK_RULE_PRIORITY_OPTIONS } from "@/lib/fitzpatrick-rules-ui";
import { useProducts } from "@/lib/queries/products";
import { useRoutines } from "@/lib/queries/routines";
import { useTreatments } from "@/lib/queries/treatments";
import type {
  FitzpatrickRule,
  FitzpatrickRuleColorKey,
  FitzpatrickRuleInput,
  FitzpatrickRulePriority,
} from "@/lib/queries/fitzpatrick-rules";
import { cn } from "@/lib/utils";

type FormState = {
  label: string;
  description: string;
  fitzpatrickScale: FitzpatrickScale;
  priority: FitzpatrickRulePriority;
  colorKey: FitzpatrickRuleColorKey;
  isActive: boolean;
  routineIds: string[];
  treatmentIds: string[];
  productGroupIds: string[];
  supplementGroupIds: string[];
};

function defaultForm(rule?: FitzpatrickRule | null): FormState {
  if (!rule) {
    return {
      label: "",
      description: "",
      fitzpatrickScale: "III",
      priority: "medium",
      colorKey: "blue",
      isActive: true,
      routineIds: [],
      treatmentIds: [],
      productGroupIds: [],
      supplementGroupIds: [],
    };
  }
  return {
    label: rule.label,
    description: rule.description ?? "",
    fitzpatrickScale: rule.fitzpatrickScale,
    priority: rule.priority,
    colorKey: rule.colorKey,
    isActive: rule.isActive,
    routineIds: rule.routineIds,
    treatmentIds: rule.treatmentIds,
    productGroupIds: rule.productGroupIds,
    supplementGroupIds: rule.supplementGroupIds,
  };
}

export function FitzpatrickRuleForm({
  rule,
  onSubmit,
}: {
  /** null = crear. */
  rule?: FitzpatrickRule | null;
  onSubmit: (input: FitzpatrickRuleInput) => Promise<void>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => defaultForm(rule));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const routines = useRoutines(true);
  const treatments = useTreatments({ kind: "treatment" });
  const catalogProducts = useProducts(undefined, "product");
  const catalogSupplements = useProducts(undefined, "supplement");

  useEffect(() => {
    setForm(defaultForm(rule));
  }, [rule]);

  const selectedType = FITZPATRICK_TYPES[form.fitzpatrickScale];

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
    if (!form.label.trim()) {
      setError("El nombre de la regla es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        label: form.label.trim(),
        description: form.description.trim() || undefined,
        fitzpatrickScale: form.fitzpatrickScale,
        priority: form.priority,
        colorKey: form.colorKey,
        isActive: form.isActive,
        routineIds: form.routineIds,
        treatmentIds: form.treatmentIds,
        productGroupIds: form.productGroupIds,
        supplementGroupIds: form.supplementGroupIds,
      });
      router.push("/doctor/reglas-fototipo");
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/doctor/reglas-fototipo"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver a reglas por fototipo
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {rule ? "Editar regla de recomendación" : "Nueva regla de recomendación"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/doctor/reglas-fototipo")}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Guardando…" : rule ? "Guardar cambios" : "Crear regla"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <ModuleCard className="space-y-4 p-5">
            <ModuleCardTitle className="text-base">1. Nombre y alcance de la regla</ModuleCardTitle>
            <div className="space-y-1.5">
              <label htmlFor="label" className="text-sm font-medium text-foreground">
                Nombre de la regla
              </label>
              <input
                id="label"
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
                placeholder="Ej: Protección solar según fototipo"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                id="description"
                rows={2}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-primary/50"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-muted-foreground">Prioridad</span>
                <select
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority: event.target.value as FitzpatrickRulePriority,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-border px-3"
                >
                  {FITZPATRICK_RULE_PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                Regla activa
              </label>
            </div>
          </ModuleCard>

          <ModuleCard className="space-y-3 p-5">
            <ModuleCardTitle className="text-base">2. Condición: fototipo de piel</ModuleCardTitle>
            <ModuleCardDescription>
              Se recomienda esto cuando el fototipo (Fitzpatrick) del paciente sea:
            </ModuleCardDescription>
            <div className="grid gap-2 sm:grid-cols-3">
              {FITZPATRICK_SCALES.map((scale) => {
                const type = FITZPATRICK_TYPES[scale];
                const active = form.fitzpatrickScale === scale;
                return (
                  <button
                    key={scale}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({ ...current, fitzpatrickScale: scale }))
                    }
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    <span
                      className="size-8 shrink-0 rounded-full border border-border/60"
                      style={{ backgroundColor: type.colorHex }}
                      aria-hidden
                    />
                    <span>
                      <span className="block text-sm font-semibold">Fototipo {scale}</span>
                      <span className="block text-xs text-muted-foreground">{type.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {selectedType.reaction}
            </p>
          </ModuleCard>

          <ModuleCard className="space-y-3 p-5">
            <ModuleCardTitle className="text-base">
              3. Acción recomendada (selecciona lo ya creado)
            </ModuleCardTitle>
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
                onChange={(ids) => setForm((current) => ({ ...current, routineIds: ids }))}
                emptyHint="Crea rutinas en Rutinas y tratamientos."
                loading={routines.isLoading}
              />
              <CatalogChecklist
                title="Tratamientos"
                icon={Layers3}
                options={treatmentOptions}
                selectedIds={form.treatmentIds}
                onChange={(ids) => setForm((current) => ({ ...current, treatmentIds: ids }))}
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
          </ModuleCard>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <ModuleCard className="sticky top-4 space-y-3 p-5">
          <ModuleCardTitle className="text-base">
            Fototipos de piel (Fitzpatrick)
          </ModuleCardTitle>
          <div className="grid grid-cols-2 gap-2">
            {FITZPATRICK_SCALES.map((scale) => {
              const type = FITZPATRICK_TYPES[scale];
              return (
                <div
                  key={scale}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-xs",
                    scale === form.fitzpatrickScale
                      ? "border-primary bg-primary/5"
                      : "border-border/70",
                  )}
                >
                  <span
                    className="mb-1 inline-block size-4 rounded-full border border-border/60 align-middle"
                    style={{ backgroundColor: type.colorHex }}
                    aria-hidden
                  />{" "}
                  <span className="font-medium">Fototipo {scale}</span>
                  <p className="mt-0.5 text-muted-foreground">{type.label}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Las recomendaciones generadas son sugerencias basadas en análisis de IA y no
            reemplazan el criterio profesional.
          </p>
        </ModuleCard>
      </div>
    </div>
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
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
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
