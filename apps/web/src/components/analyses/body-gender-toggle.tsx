"use client";

import { Button } from "@/components/ui/button";
import type { Gender } from "@/lib/body-model";

const LABELS: Record<Gender, string> = { female: "Mujer", male: "Hombre" };

/** Figura del modelo 3D. Bloqueada (`locked`) solo dice cuál es: el punto se
 * guarda sobre esa figura y el historial la pinta con la del paciente. */
export function BodyGenderToggle({
  value,
  onChange,
  locked = false,
}: {
  value: Gender;
  onChange: (gender: Gender) => void;
  locked?: boolean;
}) {
  if (locked) {
    return <p className="text-sm text-muted-foreground">Modelo: {LABELS[value]}</p>;
  }
  return (
    <div className="flex gap-2">
      {(Object.keys(LABELS) as Gender[]).map((gender) => (
        <Button
          key={gender}
          type="button"
          variant={value === gender ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(gender)}
        >
          {LABELS[gender]}
        </Button>
      ))}
    </div>
  );
}
