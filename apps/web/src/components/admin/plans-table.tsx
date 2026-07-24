"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { PlanAdmin } from "@/lib/queries/plans";

function formatCOP(price: string) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(price),
  );
}

const columnHelper = createColumnHelper<PlanAdmin>();

function buildColumns(onEdit: (plan: PlanAdmin) => void, onDelete: (plan: PlanAdmin) => void) {
  return [
    columnHelper.accessor("name", { header: "Nombre del plan" }),
    columnHelper.accessor((row) => row.provider.name, {
      id: "provider",
      header: "Proveedor",
    }),
    columnHelper.accessor("analysisLimit", { header: "Límite de análisis" }),
    columnHelper.accessor("price", {
      header: "Precio",
      cell: (info) => formatCOP(info.getValue()),
    }),
    columnHelper.accessor("durationDays", { header: "Duración (días)" }),
    columnHelper.accessor("isActive", {
      header: "Estado",
      cell: (info) => (
        <Badge variant={info.getValue() ? "default" : "secondary"}>
          {info.getValue() ? "Activo" : "Inactivo"}
        </Badge>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Creado el",
      cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(row.original)}>
            Editar
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(row.original)}>
            Eliminar
          </Button>
        </div>
      ),
    }),
  ];
}

export function PlansTable({
  plans,
  onEdit,
  onDelete,
}: {
  plans: PlanAdmin[];
  onEdit: (plan: PlanAdmin) => void;
  onDelete: (plan: PlanAdmin) => void;
}) {
  return (
    <DataTable
      columns={buildColumns(onEdit, onDelete)}
      data={plans}
      searchPlaceholder="Buscar plan..."
      emptyMessage="Sin planes."
    />
  );
}
