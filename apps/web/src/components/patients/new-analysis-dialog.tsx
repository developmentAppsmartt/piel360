"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, ClipboardPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  newAnalysisHref,
  useAllowedAnalysisOptions,
} from "./new-analysis-options";

/** «Nuevo análisis»: con varios tipos habilitados pregunta cuál; con uno solo
 * va directo. Antes llevaba siempre al estético. */
export function NewAnalysisDialog({ patientId }: { patientId: string }) {
  const options = useAllowedAnalysisOptions();
  const [open, setOpen] = useState(false);

  if (options.length === 0) return null;

  const trigger = (
    <>
      <Plus className="size-4" />
      Nuevo análisis
    </>
  );

  if (options.length === 1) {
    return (
      <Button
        nativeButton={false}
        render={<Link href={newAnalysisHref(patientId, options[0])} />}
        className="gap-1.5"
      >
        {trigger}
      </Button>
    );
  }

  return (
    <>
      <Button className="gap-1.5" onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader className="flex-row items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardPlus className="size-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <DialogTitle>Nuevo análisis</DialogTitle>
              <DialogDescription>
                Selecciona el tipo de análisis que deseas realizar para este
                paciente.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-2">
            {options.map((option) => (
              <Link
                key={option.slug}
                href={newAnalysisHref(patientId, option)}
                className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <option.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {option.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
