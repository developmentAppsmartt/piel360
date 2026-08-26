"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusIcon, Pencil, Trash2, FolderOpen } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import {
  useTreatmentCategories,
  useCreateTreatmentCategory,
  useUpdateTreatmentCategory,
  useDeleteTreatmentCategory,
  type TreatmentCategory,
} from "@/lib/queries/treatments";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  categoryName: z.string().min(1, "Requerido").max(120),
});
type FormValues = z.infer<typeof schema>;

// ─── Form reutilizable ────────────────────────────────────────────────────────

function CategoryForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: TreatmentCategory;
  onSubmit: (values: FormValues) => Promise<unknown>;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoryName: defaultValues?.categoryName ?? "" },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      setError("root", {
        message:
          err instanceof ApiError ? err.message : "No se pudo guardar la categoría.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label
          htmlFor="categoryName"
          className="block text-sm font-medium text-foreground"
        >
          Nombre de categoría
        </label>
        <input
          id="categoryName"
          placeholder="Ej: Invasivo, No invasivo..."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          {...register("categoryName")}
        />
        {errors.categoryName && (
          <p className="text-sm text-destructive">{errors.categoryName.message}</p>
        )}
      </div>

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Columnas de tabla ────────────────────────────────────────────────────────

const col = createColumnHelper<TreatmentCategory>();

// ─── Componente principal ─────────────────────────────────────────────────────

export function TreatmentCategoriesTab() {
  const { data: categories, isLoading } = useTreatmentCategories();
  const createMutation = useCreateTreatmentCategory();
  const deleteMutation = useDeleteTreatmentCategory();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TreatmentCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TreatmentCategory | null>(null);

  const columns = [
    col.accessor("categoryName", { header: "Nombre" }),
    col.accessor((row) => row._count?.treatments ?? 0, {
      id: "treatments",
      header: "Tratamientos",
      cell: (info) => (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <FolderOpen className="size-3.5" />
          {info.getValue()}
        </span>
      ),
    }),
    col.accessor("createdAt", {
      header: "Creado",
      cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
    }),
    col.accessor("lastModified", {
      header: "Modificado",
      cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
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
          Las categorías te ayudan a organizar tus tratamientos (ej. Invasivo, No invasivo).
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            id="btn-nueva-categoria-tratamiento"
            render={
              <Button>
                <PlusIcon className="mr-2 size-4" />
                Nueva categoría
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva categoría de tratamiento</DialogTitle>
            </DialogHeader>
            <CategoryForm
              submitLabel="Crear"
              onSubmit={async (values) => {
                await createMutation.mutateAsync(values);
                setCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando categorías...</p>
      )}
      {categories && (
        <DataTable
          columns={columns}
          data={categories}
          searchPlaceholder="Buscar categoría..."
          emptyMessage="No hay categorías aún. Crea una para empezar."
        />
      )}

      {editTarget && (
        <EditCategoryDialog
          category={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar categoría?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Los tratamientos de{" "}
              <strong>&ldquo;{deleteTarget.categoryName}&rdquo;</strong> quedarán sin
              categoría. Esta acción no se puede deshacer.
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

// ─── Sub-componente editar ────────────────────────────────────────────────────

function EditCategoryDialog({
  category,
  onClose,
}: {
  category: TreatmentCategory;
  onClose: () => void;
}) {
  const updateMutation = useUpdateTreatmentCategory(category.id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar categoría</DialogTitle>
        </DialogHeader>
        <CategoryForm
          defaultValues={category}
          submitLabel="Guardar cambios"
          onSubmit={async (values) => {
            await updateMutation.mutateAsync(values);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
