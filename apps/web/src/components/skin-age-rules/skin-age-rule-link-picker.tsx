"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/lib/queries/products";
import { useRoutines } from "@/lib/queries/routines";
import { useTreatments } from "@/lib/queries/treatments";
import { cn } from "@/lib/utils";

export type LinkPickerKind = "routines" | "treatments" | "products" | "supplements";

const KIND_LABELS: Record<LinkPickerKind, string> = {
  routines: "Rutinas",
  treatments: "Tratamientos",
  products: "Productos",
  supplements: "Suplementos",
};

export function SkinAgeRuleLinkPickerDialog({
  kind,
  open,
  selectedIds,
  onClose,
  onSave,
}: {
  kind: LinkPickerKind;
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const routines = useRoutines(open && kind === "routines");
  const treatments = useTreatments(
    open && kind === "treatments" ? { kind: "treatment" } : undefined,
  );
  const products = useProducts(undefined, "product", {
    enabled: open && kind === "products",
  });
  const supplements = useProducts(undefined, "supplement", {
    enabled: open && kind === "supplements",
  });

  const options = useMemo(() => {
    if (kind === "routines") {
      return (routines.data ?? []).map((routine) => ({
        id: routine.id,
        label: routine.name,
        hint: `${routine.steps.length} paso${routine.steps.length === 1 ? "" : "s"}`,
      }));
    }
    if (kind === "treatments") {
      return (treatments.data ?? []).map((treatment) => ({
        id: treatment.id,
        label: treatment.name,
        hint: treatment.category?.categoryName ?? "Tratamiento",
      }));
    }
    if (kind === "supplements") {
      return (supplements.data ?? []).map((product) => ({
        id: product.id,
        label: product.productName,
        hint: product.category?.categoryName ?? "Suplemento",
      }));
    }
    return (products.data ?? []).map((product) => ({
      id: product.id,
      label: product.productName,
      hint: product.category?.categoryName ?? "Producto",
    }));
  }, [kind, routines.data, treatments.data, products.data, supplements.data]);

  function toggle(id: string) {
    setDraft((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
        else setDraft(selectedIds);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Seleccionar {KIND_LABELS[kind].toLowerCase()}</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {options.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay {KIND_LABELS[kind].toLowerCase()} disponibles. Créalos primero en
              Productos o Rutinas.
            </p>
          ) : (
            options.map((option) => {
              const active = draft.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30",
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.hint}</span>
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 size-4 shrink-0 rounded border",
                      active ? "border-primary bg-primary" : "border-muted-foreground/40",
                    )}
                  />
                </button>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Guardar selección ({draft.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
