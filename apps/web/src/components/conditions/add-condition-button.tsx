"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Va en el pie y junto a «Activo»: con el formulario largo, el del pie no se
 * veía al empezar. */
export function AddConditionButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  /** true cuando ya no queda ninguna métrica (o zona) sin condición. */
  disabled: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Todas las métricas ya tienen una condición" : undefined}
    >
      <Plus className="mr-1 size-4" />
      Agregar condición
    </Button>
  );
}
