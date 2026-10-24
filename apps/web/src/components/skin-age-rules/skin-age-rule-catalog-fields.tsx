"use client";

import { useMemo } from "react";
import { CalendarDays, FlaskConical, Layers3, Pill } from "lucide-react";
import { CatalogChecklist } from "@/components/shared/catalog-checklist";
import { useProducts } from "@/lib/queries/products";
import { useRoutines } from "@/lib/queries/routines";
import { useTreatments } from "@/lib/queries/treatments";
import type { SkinAgeRuleFormState } from "@/lib/skin-age-rule-range";

type CatalogSelection = Pick<
  SkinAgeRuleFormState,
  "productGroupIds" | "routineIds" | "treatmentIds" | "supplementGroupIds"
>;

/** «Entonces recomendar»: lo ya creado del catálogo que muestra la regla. */
export function SkinAgeRuleCatalogFields({
  enabled,
  value,
  onChange,
}: {
  /** Solo se piden los catálogos con el diálogo abierto. */
  enabled: boolean;
  value: CatalogSelection;
  onChange: (patch: Partial<CatalogSelection>) => void;
}) {
  const routines = useRoutines(enabled);
  const treatments = useTreatments(enabled ? { kind: "treatment" } : undefined);
  const catalogProducts = useProducts(undefined, "product", { enabled });
  const catalogSupplements = useProducts(undefined, "supplement", { enabled });

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

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <CatalogChecklist
        title="Productos"
        icon={FlaskConical}
        options={productOptions}
        selectedIds={value.productGroupIds}
        onChange={(ids) => onChange({ productGroupIds: ids })}
        emptyHint="Crea productos en el módulo Productos."
        loading={catalogProducts.isLoading}
      />
      <CatalogChecklist
        title="Rutinas"
        icon={CalendarDays}
        options={routineOptions}
        selectedIds={value.routineIds}
        onChange={(ids) => onChange({ routineIds: ids })}
        emptyHint="Crea rutinas en Rutinas y tratamientos."
        loading={routines.isLoading}
      />
      <CatalogChecklist
        title="Tratamientos"
        icon={Layers3}
        options={treatmentOptions}
        selectedIds={value.treatmentIds}
        onChange={(ids) => onChange({ treatmentIds: ids })}
        emptyHint="Crea tratamientos en Rutinas y tratamientos."
        loading={treatments.isLoading}
      />
      <CatalogChecklist
        title="Suplementos"
        icon={Pill}
        options={supplementOptions}
        selectedIds={value.supplementGroupIds}
        onChange={(ids) => onChange({ supplementGroupIds: ids })}
        emptyHint="Crea suplementos en el módulo Productos."
        loading={catalogSupplements.isLoading}
      />
    </div>
  );
}
