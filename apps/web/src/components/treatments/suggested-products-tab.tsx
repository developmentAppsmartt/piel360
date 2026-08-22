"use client";

import { useState } from "react";
import { PlusIcon, Pencil, Trash2 } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TreatmentForm } from "./treatment-form";
import { TreatmentItemsEditor } from "./treatment-items-editor";
import {
  useCreateTreatment,
  useDeleteTreatment,
  useTreatment,
  useTreatments,
  useUpdateTreatment,
  type Treatment,
} from "@/lib/queries/treatments";

const col = createColumnHelper<Treatment>();

// ─── Diálogo de creación (dos pasos: primero crea, luego agrega productos) ────

function CreateSuggestedProductsDialog({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateTreatment();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const created = useTreatment(createdId ?? "");

  if (createdId && created.data) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar productos</DialogTitle>
          </DialogHeader>
          <TreatmentItemsEditor treatment={created.data} itemsLabel="conjunto" />
          <DialogFooter>
            <Button onClick={onClose}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo grupo de productos sugeridos</DialogTitle>
        </DialogHeader>
        <TreatmentForm
          forceCategoryPicker={false}
          submitLabel="Crear"
          onSubmit={async (input) => {
            const treatment = await createMutation.mutateAsync(input);
            setCreatedId(treatment.id);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogo de edición ───────────────────────────────────────────────────────

function EditSuggestedProductsDialog({
  treatmentId,
  onClose,
}: {
  treatmentId: string;
  onClose: () => void;
}) {
  // Reactivo (no un prop estático) — así agregar/eliminar productos dentro
  // de este mismo diálogo se refleja de inmediato, sin recargar.
  const { data: treatment } = useTreatment(treatmentId);
  const updateMutation = useUpdateTreatment(treatmentId);

  if (!treatment) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar grupo de productos sugeridos</DialogTitle>
        </DialogHeader>
        <TreatmentForm
          defaultValues={treatment}
          forceCategoryPicker={false}
          submitLabel="Guardar cambios"
          onSubmit={(input) => updateMutation.mutateAsync(input)}
        />
        <div className="border-t border-border pt-4">
          <TreatmentItemsEditor treatment={treatment} itemsLabel="conjunto" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function SuggestedProductsTab() {
  const { data: treatments, isLoading } = useTreatments({ kind: "plain" });
  const deleteMutation = useDeleteTreatment();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Treatment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);

  const columns = [
    col.accessor("name", { header: "Nombre" }),
    col.accessor("isActive", {
      header: "Estado",
      cell: (info) =>
        info.getValue() ? <Badge>Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>,
    }),
    col.accessor((t) => t.conditions.length, {
      id: "conditions",
      header: "Condiciones",
      cell: (info) => `${info.getValue()} condición${info.getValue() === 1 ? "" : "es"}`,
    }),
    col.accessor((t) => t.items.length, {
      id: "items",
      header: "Productos",
      cell: (info) => `${info.getValue()} producto${info.getValue() === 1 ? "" : "s"}`,
    }),
    col.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditTarget(row.original);
            }}
          >
            <Pencil className="size-4" />
            <span className="sr-only">Editar</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row.original);
            }}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Eliminar</span>
          </Button>
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configura grupos de productos que se sugieren automáticamente por puntaje,
          con el orden en que quieres que se muestren.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          Nuevo grupo sugerido
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {treatments && (
        <DataTable
          columns={columns}
          data={treatments}
          searchPlaceholder="Buscar..."
          emptyMessage="No hay grupos aún. Crea uno para empezar."
        />
      )}

      {createOpen && (
        <CreateSuggestedProductsDialog onClose={() => setCreateOpen(false)} />
      )}
      {editTarget && (
        <EditSuggestedProductsDialog
          treatmentId={editTarget.id}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Se eliminará <strong>&ldquo;{deleteTarget.name}&rdquo;</strong> permanentemente.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await deleteMutation.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
