"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import { RoutineStepMediaUpload } from "@/components/routines/routine-step-media-upload";
import { apiClientFetch } from "@/lib/api-client";
import { useProducts } from "@/lib/queries/products";
import {
  useCreateRoutineStep,
  useDeleteRoutineStep,
  useUpdateRoutineStep,
  type RoutineStep,
} from "@/lib/queries/routines";

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring disabled:opacity-50";

function StepEditForm({
  routineId,
  step,
  onDone,
}: {
  routineId: string;
  step?: RoutineStep;
  onDone: () => void;
}) {
  const { data: products } = useProducts();
  const createStep = useCreateRoutineStep(routineId);
  const updateStep = useUpdateRoutineStep(routineId, step?.id ?? "");
  const [title, setTitle] = useState(step?.title ?? "");
  const [description, setDescription] = useState(step?.description ?? "");
  const [productId, setProductId] = useState(step?.productId ?? "");

  const isPending = createStep.isPending || updateStep.isPending;

  async function handleSave() {
    if (!title.trim()) return;
    const input = {
      order: step?.order ?? 0,
      title,
      description: description || undefined,
      productId: productId ? Number(productId) : undefined,
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
          Producto vinculado <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </label>
        <select className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Ninguno</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.productName}
            </option>
          ))}
        </select>
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
  const qc = useQueryClient();

  const sorted = [...steps].sort((a, b) => a.order - b.order);

  // useUpdateRoutineStep está atado a un solo stepId — para el swap de
  // reordenamiento se necesitan actualizar dos pasos distintos a la vez, así
  // que acá se llama la API directo en vez de usar ese hook.
  async function move(step: RoutineStep, direction: -1 | 1) {
    const swapWith = sorted[sorted.indexOf(step) + direction];
    if (!swapWith) return;
    await Promise.all([
      apiClientFetch(`/routines/${routineId}/steps/${step.id}`, {
        method: "PATCH",
        body: JSON.stringify({ order: swapWith.order }),
      }),
      apiClientFetch(`/routines/${routineId}/steps/${swapWith.id}`, {
        method: "PATCH",
        body: JSON.stringify({ order: step.order }),
      }),
    ]);
    qc.invalidateQueries({ queryKey: ["routines", routineId] });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
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

      {sorted.map((step, index) =>
        editingId === step.id ? (
          <StepEditForm key={step.id} routineId={routineId} step={step} onDone={() => setEditingId(null)} />
        ) : (
          <ModuleCard key={step.id} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {index + 1}. {step.title}
              </p>
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
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === 0}
                onClick={() => move(step, -1)}
              >
                <ArrowUp className="size-4" />
                <span className="sr-only">Subir</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === sorted.length - 1}
                onClick={() => move(step, 1)}
              >
                <ArrowDown className="size-4" />
                <span className="sr-only">Bajar</span>
              </Button>
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
        ),
      )}

      {adding && <StepEditForm routineId={routineId} onDone={() => setAdding(false)} />}
    </div>
  );
}
