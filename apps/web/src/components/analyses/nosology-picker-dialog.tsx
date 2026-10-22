"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  filterNosologyCategories,
  type NosologyCategory,
  type NosologyItem,
} from "@piel360/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Lista con la que el profesional corrige el diagnóstico cuando ninguno de los
 * de la IA le sirve: grupo de patologías → condición. Mismo recorrido que el
 * `NosologyPicker` del móvil.
 */
export function NosologyPickerDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: NosologyItem, category: NosologyCategory) => void;
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);

  const visible = useMemo(() => filterNosologyCategories(query), [query]);
  const category = categoryId
    ? (visible.find((c) => c.id === categoryId) ?? null)
    : null;

  function reset() {
    setQuery("");
    setCategoryId(null);
    setItemId(null);
  }

  function close() {
    reset();
    onClose();
  }

  function openCategory(id: string) {
    setCategoryId(id);
    setItemId(null);
  }

  function back() {
    setCategoryId(null);
    setItemId(null);
  }

  function confirm() {
    const item = category?.items.find((i) => i.id === itemId);
    if (!category || !item) return;
    onSelect(item, category);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {category ? (
              <button
                type="button"
                onClick={back}
                aria-label="Volver a los grupos"
                className="rounded-full p-1 hover:bg-muted"
              >
                <ChevronLeft className="size-4" />
              </button>
            ) : null}
            {category ? category.name : "Seleccionar de la lista"}
          </DialogTitle>
          <DialogDescription>
            Busca o elige una condición para reemplazar el diagnóstico de la IA.
          </DialogDescription>
        </DialogHeader>

        <label className="relative block">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar grupo o condición"
            className="h-9 w-full rounded-md border border-border bg-background pr-3 pl-9 text-sm outline-none focus:border-primary"
          />
        </label>

        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {category
            ? category.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setItemId(item.id)}
                    aria-pressed={item.id === itemId}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left text-sm",
                      item.id === itemId
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-transparent hover:bg-muted",
                    )}
                  >
                    {item.name}
                  </button>
                </li>
              ))
            : visible.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openCategory(c.id)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span>{c.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {c.items.length}
                      <ChevronRight className="size-4" />
                    </span>
                  </button>
                </li>
              ))}
          {(category ? category.items : visible).length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No hay {category ? "condiciones" : "grupos"} que coincidan.
            </li>
          ) : null}
        </ul>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="button" disabled={!itemId} onClick={confirm}>
            Reemplazar diagnóstico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
