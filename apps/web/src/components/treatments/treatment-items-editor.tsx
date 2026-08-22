"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortableList, DragHandle } from "@/components/shared/sortable-list";
import { useProducts } from "@/lib/queries/products";
import {
  useCreateTreatmentItem,
  useDeleteTreatmentItem,
  useReorderTreatmentItems,
  type Treatment,
  type TreatmentItem,
} from "@/lib/queries/treatments";

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring disabled:opacity-50";

export function TreatmentItemsEditor({
  treatment,
  itemsLabel = "tratamiento",
}: {
  treatment: Treatment;
  /** "tratamiento" | "conjunto" — según el contexto donde se use el editor. */
  itemsLabel?: string;
}) {
  const { data: products } = useProducts();
  const createMutation = useCreateTreatmentItem(treatment.id);
  const deleteMutation = useDeleteTreatmentItem(treatment.id);
  const reorderMutation = useReorderTreatmentItems(treatment.id);

  const [newProductId, setNewProductId] = useState("");
  const [newNote, setNewNote] = useState("");

  const items = [...treatment.items].sort((a, b) => a.order - b.order);

  async function handleAdd() {
    if (!newProductId) return;
    await createMutation.mutateAsync({
      productId: newProductId,
      order: items.length,
      note: newNote || undefined,
    });
    setNewProductId("");
    setNewNote("");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">Productos de este {itemsLabel}</p>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Sin productos aún. Agrega el primero abajo — puedes reordenarlos luego arrastrando.
        </p>
      )}

      <SortableList
        items={items}
        getId={(item: TreatmentItem) => item.id}
        onReorder={(orderedIds) => reorderMutation.mutate(orderedIds)}
        renderItem={(item, dragHandle) => (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <DragHandle {...dragHandle} />
            {item.product.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.product.imageUrl}
                alt=""
                className="size-10 shrink-0 rounded-lg border border-border object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.product.productName}</p>
              {item.note && (
                <p className="truncate text-xs text-muted-foreground">{item.note}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate(item.id)}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Eliminar</span>
            </Button>
          </div>
        )}
      />

      <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium text-foreground">Agregar producto</p>
        <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <select
            className={inputCls}
            value={newProductId}
            onChange={(e) => setNewProductId(e.target.value)}
          >
            <option value="">Selecciona un producto</option>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.productName}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Nota (opcional)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <Button
            type="button"
            disabled={!newProductId || createMutation.isPending}
            onClick={handleAdd}
          >
            <Plus className="mr-1 size-4" />
            {createMutation.isPending ? "Agregando..." : "Agregar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
