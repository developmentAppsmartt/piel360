"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogChecklist, productCatalogOption } from "@/components/shared/catalog-checklist";
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
  const { data: products, isLoading: productsLoading } = useProducts();
  // Un producto va una sola vez: los que ya están no se ofrecen. El API
  // también lo rechaza (409), por si dos pestañas agregan el mismo.
  const productOptions = useMemo(() => {
    const added = new Set(treatment.items.map((item) => item.product.id));
    return (products ?? [])
      .filter((product) => !added.has(product.id))
      .map((product) => productCatalogOption(product));
  }, [products, treatment.items]);
  const allAdded = (products?.length ?? 0) > 0 && productOptions.length === 0;
  const createMutation = useCreateTreatmentItem(treatment.id);
  const deleteMutation = useDeleteTreatmentItem(treatment.id);
  const reorderMutation = useReorderTreatmentItems(treatment.id);

  const [newProductId, setNewProductId] = useState("");
  const [newNote, setNewNote] = useState("");

  const items = [...treatment.items].sort((a, b) => a.order - b.order);

  async function handleAdd() {
    if (!newProductId) return;
    try {
      await createMutation.mutateAsync({
        productId: newProductId,
        order: items.length,
        note: newNote || undefined,
      });
    } catch {
      return; // el mensaje sale de createMutation.error
    }
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

      <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
        <CatalogChecklist
          title="Agregar producto"
          icon={FlaskConical}
          options={productOptions}
          selectedIds={newProductId ? [newProductId] : []}
          // Uno a la vez: el último que se marca reemplaza al anterior.
          onChange={(ids) => setNewProductId(ids.at(-1) ?? "")}
          emptyHint={
            allAdded
              ? `Ya agregaste todos los productos del catálogo a este ${itemsLabel}.`
              : "No hay productos en el catálogo."
          }
          loading={productsLoading}
        />
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
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
        {createMutation.error ? (
          <p className="text-sm text-destructive">{createMutation.error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
