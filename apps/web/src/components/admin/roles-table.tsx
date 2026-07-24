"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { Role } from "@/lib/queries/roles";

const columnHelper = createColumnHelper<Role>();

function buildColumns(onEdit: (role: Role) => void, onDelete: (role: Role) => void) {
  return [
    columnHelper.accessor("name", { header: "Nombre" }),
    columnHelper.accessor((row) => row.permissions.length, {
      id: "permissions",
      header: "Permisos",
      cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
    }),
    columnHelper.accessor((row) => row._count.users, {
      id: "users",
      header: "Usuarios",
      cell: (info) => <Badge variant="secondary">{info.getValue()}</Badge>,
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

export function RolesTable({
  roles,
  onEdit,
  onDelete,
}: {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}) {
  return (
    <DataTable
      columns={buildColumns(onEdit, onDelete)}
      data={roles}
      searchPlaceholder="Buscar rol..."
      emptyMessage="Sin roles."
    />
  );
}
