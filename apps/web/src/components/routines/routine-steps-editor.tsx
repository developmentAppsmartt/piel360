"use client";

import { useState } from "react";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import { RoutineStepMediaUpload } from "@/components/routines/routine-step-media-upload";
import { DragHandle, SortableList } from "@/components/shared/sortable-list";
import { useProducts } from "@/lib/queries/products";
import {
  useCreateRoutineStep,
  useDeleteRoutineStep,
  useReorderRoutineSteps,
  useUpdateRoutineStep,
  type RoutineStep,
} from "@/lib/queries/routines";

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring disabled:opacity-50";

function StepEditForm({
  routineId,
  step,
  nextOrder,
  onDone,
}: {
  routineId: string;
  step?: RoutineStep;
  /** Posicion del paso nuevo: el final de la lista. */
  nextOrder: number;
  onDone: () => void;
}) {
  const { data: products } = useProducts();
  const createStep = useCreateRoutineStep(routineId);
  const updateStep = useUpdateRoutineStep(routineId, step?.id ?? "");
  const [title, setTitle] = useState(step?.title ?? "");
  const [description, setDescription] = useState(step?.description ?? "");
  const [productIds, setProductIds] = useState<string[]>(
    step?.products.map((link) => link.product.id) ?? [],
  );

  const isPending = createStep.isPending || updateStep.isPending;

  function toggleProduct(id: string) {
    setProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (!title.trim()) return;
    const input = {
      order: step?.order ?? nextOrder,
      title,
      description: description || undefined,
      productIds: productIds.map((id) => Number(id)),
    };
    if (step) {
      await updateStep.mutateAsync(input);
    } else {
      await createStep.mutateAsync(input);
    }
    onDone();
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Título del paso</label>
        <input
          className={inputCls}
          placeholder="Ej: Limpieza facial"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">
          Descripción / horario <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          className={inputCls}
          rows={2}
          placeholder="Ej: Aplicar cada noche antes de dormir, dejar actuar 10 minutos"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">
          Productos vinculados{" "}
          <span className="text-xs font-normal text-muted-foreground">(opcional, puedes elegir varios)</span>
        </label>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-2">
          {!products?.length && (
            <p className="px-1 py-1 text-sm text-muted-foreground">No hay productos en el catálogo.</p>
          )}
          {products?.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                className="size-4"
                checked={productIds.includes(p.id)}
                onChange={() => toggleProduct(p.id)}
              />
              {p.productName}
            </label>
          ))}
        </div>
      </div>
      {step && <RoutineStepMediaUpload routineId={routineId} stepId={step.id} currentMediaUrl={step.mediaUrl} currentMediaType={step.mediaType} />}
      {!step && (
        <p className="text-xs text-muted-foreground">
          Guarda el paso primero para poder subirle una imagen, GIF o video.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="button" size="sm" disabled={isPending || !title.trim()} onClick={handleSave}>
          {isPending ? "Guardando..." : "Guardar paso"}
        </Button>
      </div>
    </div>
  );
}

export function RoutineStepsEditor({
  routineId,
  steps,
}: {
  routineId: string;
  steps: RoutineStep[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const deleteStep = useDeleteRoutineStep(routineId);
  const reorderSteps = useReorderRoutineSteps(routineId);

  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Pasos de la rutina</p>
        {!adding && (
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 size-4" />
            Agregar paso
          </Button>
        )}
      </div>

      {sorted.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">Esta rutina todavía no tiene pasos.</p>
      )}

      {sorted.length > 1 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <GripVertical className="size-3.5 shrink-0" aria-hidden />
          Arrastra los pasos desde el asa para cambiar su orden.
        </p>
      )}

      <SortableList
        items={sorted}
        getId={(step: RoutineStep) => step.id}
        onReorder={(orderedIds) => reorderSteps.mutate(orderedIds)}
        renderItem={(step, dragHandle) =>
          editingId === step.id ? (
            <StepEditForm
              routineId={routineId}
              step={step}
              nextOrder={sorted.length}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <ModuleCard className="flex items-start gap-3 p-3">
              {/* El asa solo aparece si hay algo que reordenar. */}
              {sorted.length > 1 ? (
                <span className="mt-1 shrink-0">
                  <DragHandle {...dragHandle} />
                </span>
              ) : null}
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary tabular-nums">
                {sorted.indexOf(step) + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{step.title}</p>
                {step.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                )}
                {step.mediaUrl && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tiene {step.mediaType === "video" ? "video" : step.mediaType === "gif" ? "GIF" : "imagen"} adjunto
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditingId(step.id)}>
                  <Pencil className="size-4" />
                  <span className="sr-only">Editar</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteStep.mutate(step.id)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Eliminar</span>
                </Button>
              </div>
            </ModuleCard>
          )
        }
      />

      {adding && (
        <StepEditForm
          routineId={routineId}
          nextOrder={sorted.length}
          onDone={() => setAdding(false)}
        />
      )}
    </div>
  );
}
