"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, PlusIcon, Trash2 } from "lucide-react";
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
import {
  useDeleteTreatment,
  useTreatments,
  type Treatment,
} from "@/lib/queries/treatments";

const col = createColumnHelper<Treatment>();

/** Lista de Tratamientos ("kind=treatment", con categoría) o de Productos
 * sugeridos por puntaje ("kind=plain", sin categoría) — mismo backend,
 * mismas rutas de creación/edición, distinta base de ruta y filtro. */
export function TreatmentsListTab({
  kind,
  basePath,
}: {
  kind: "plain" | "treatment";
  basePath: string;
}) {
  const { data: treatments, isLoading } = useTreatments({ kind });
  const deleteMutation = useDeleteTreatment();
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);

  const categoryColumn = col.accessor((t) => t.category?.categoryName ?? "—", {
    id: "category",
    header: "Categoría",
    cell: (info) => <Badge variant="secondary">{info.getValue()}</Badge>,
  });

  const columns = [
    col.accessor("name", { header: "Nombre" }),
    ...(kind === "treatment" ? [categoryColumn] : []),
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
            nativeButton={false}
            render={<Link href={`${basePath}/${row.original.id}`} onClick={(e) => e.stopPropagation()} />}
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
          {kind === "treatment"
            ? "Configura tratamientos por categoría, condicionados por puntaje."
            : "Configura grupos de productos sugeridos automáticamente por puntaje."}
        </p>
        <Button nativeButton={false} render={<Link href={`${basePath}/nueva`} />}>
          <PlusIcon className="mr-2 size-4" />
          {kind === "treatment" ? "Nuevo tratamiento" : "Nuevo grupo sugerido"}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {treatments && (
        <DataTable
          columns={columns}
          data={treatments}
          searchPlaceholder="Buscar..."
          emptyMessage="No hay registros aún. Crea uno para empezar."
          getRowHref={(row) => `${basePath}/${row.id}`}
        />
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Se eliminará <strong>&ldquo;{deleteTarget.name}&rdquo;</strong> permanentemente,
              junto con sus condiciones y productos.
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
