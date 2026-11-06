"use client";

import { useState } from "react";

/** Paso de un asistente que, al cambiar, lleva la ventana al inicio. Sin
 * esto, tras un paso largo (la figura 3D) el siguiente, más corto, quedaba
 * fuera de la vista y el usuario veía la página en blanco. */
export function useWizardStep<Step>(initial: Step) {
  const [step, setStep] = useState<Step>(initial);

  function goTo(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  return [step, goTo] as const;
}
