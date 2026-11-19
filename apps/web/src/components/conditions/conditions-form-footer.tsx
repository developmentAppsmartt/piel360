"use client";

import { Button } from "@/components/ui/button";
import { AddConditionButton } from "./add-condition-button";

/** Pie pegado al borde inferior: con muchas condiciones, «Agregar condición»
 * quedaba arriba, fuera de la vista, y había que volver a subir. */
export function ConditionsFormFooter({
  onAddCondition,
  canAddCondition,
  isSubmitting,
  submitLabel,
}: {
  onAddCondition: () => void;
  /** false cuando ya no queda ninguna métrica (o zona) sin condición. */
  canAddCondition: boolean;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
      <AddConditionButton onClick={onAddCondition} disabled={!canAddCondition} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </div>
  );
}
