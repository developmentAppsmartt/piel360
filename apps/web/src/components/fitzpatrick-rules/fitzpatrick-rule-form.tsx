"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Droplet } from "lucide-react";
import type { FitzpatrickScale } from "@piel360/shared";
import { FITZPATRICK_SCALES } from "@piel360/shared";
import { RuleScopePicker } from "@/components/skin-age-rules/rule-scope-picker";
import { SkinAgeRuleCatalogFields } from "@/components/skin-age-rules/skin-age-rule-catalog-fields";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardDescription, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { FITZPATRICK_TYPES } from "@/lib/fitzpatrick-labels";
import { FITZPATRICK_RULE_PRIORITY_OPTIONS } from "@/lib/fitzpatrick-rules-ui";
import type {
  FitzpatrickRule,
  FitzpatrickRuleColorKey,
  FitzpatrickRuleInput,
  FitzpatrickRulePriority,
} from "@/lib/queries/fitzpatrick-rules";
import { SKIN_TYPE_OPTIONS } from "@/lib/skin-type-options";
import { cn } from "@/lib/utils";

type FormState = {
  label: string;
  description: string;
  fitzpatrickScale: FitzpatrickScale;
  /** null = todos los biotipos; [] = «específicos» sin elegir todavía. */
  skinTypes: string[] | null;
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
      skinTypes: null,
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
    skinTypes: rule.skinTypes?.length ? rule.skinTypes : null,
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

  const selectedType = FITZPATRICK_TYPES[form.fitzpatrickScale];

  async function handleSave() {
    setError(null);
    if (!form.label.trim()) {
      setError("El nombre de la regla es obligatorio.");
      return;
    }
    if (form.skinTypes?.length === 0) {
      setError("Elige al menos un biotipo o aplica a todos.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        label: form.label.trim(),
        description: form.description.trim() || undefined,
        fitzpatrickScale: form.fitzpatrickScale,
        skinTypes: form.skinTypes ?? [],
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
            <ModuleCardTitle className="text-base">2. Condición: fototipo y biotipo</ModuleCardTitle>
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
            <RuleScopePicker
              name="alcance-biotipo"
              icon={Droplet}
              title="Alcance por biotipo"
              hint="Aplica a todos los biotipos o solo a los que elijas."
              allLabel="Aplicar a todos los biotipos"
              specificLabel="Aplicar a biotipos específicos"
              options={SKIN_TYPE_OPTIONS}
              value={form.skinTypes}
              onChange={(skinTypes) => setForm((current) => ({ ...current, skinTypes }))}
            />
          </ModuleCard>

          <ModuleCard className="space-y-3 p-5">
            <ModuleCardTitle className="text-base">
              3. Acción recomendada (selecciona lo ya creado)
            </ModuleCardTitle>
            <SkinAgeRuleCatalogFields
              enabled
              value={form}
              onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
            />
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
