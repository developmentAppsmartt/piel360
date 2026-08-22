"use client";

import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const STORAGE_KEY = "piel360-routines-onboarding-seen";

const EXAMPLES = [
  {
    condition: "Arrugas es menor o igual a 70",
    meaning:
      'Si en el análisis el puntaje de "Arrugas" sale 70 o menos (piel con más arrugas de lo ideal), esta rutina se le va a recomendar al paciente automáticamente.',
  },
  {
    condition: "Poros es mayor que 60",
    meaning:
      'Si el puntaje de "Poros" sale más de 60 (poco visibles/saludables), esta otra rutina se recomienda — puedes usar la misma métrica con condiciones distintas en rutinas distintas.',
  },
  {
    condition: "Manchas de edad es menor que 50 — o — Enrojecimiento es menor que 50",
    meaning:
      "Si una rutina tiene varias condiciones, basta con que se cumpla una sola para que se recomiende — no hace falta que se cumplan todas.",
  },
];

export function RoutineOnboarding() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // localStorage no existe en el server — se abre client-only después del
    // mount para no desincronizar el HTML de SSR/hidratación (que siempre
    // arranca con open=false).
    if (!localStorage.getItem(STORAGE_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, "1");
    }
  }, []);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <HelpCircle className="mr-1 size-4" />
        ¿Cómo funciona esto?
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>¿Cómo funcionan las rutinas?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Cada análisis facial le da un puntaje a cosas como arrugas, poros o manchas.
              Una <strong>condición</strong> es una regla simple que compara ese puntaje con
              un número que tú eliges, para decidir cuándo mostrarle una rutina al paciente.
            </p>
            <div className="space-y-3">
              {EXAMPLES.map((example) => (
                <div key={example.condition} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="font-mono text-sm font-medium text-primary">
                    &ldquo;{example.condition}&rdquo;
                  </p>
                  <p className="mt-1 text-muted-foreground">{example.meaning}</p>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
