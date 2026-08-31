"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { Role } from "@/lib/queries/roles";

const columnHelper = createColumnHelper<Role>();

function buildColumns(onDelete: (role: Role) => void) {
  return [
    columnHelper.accessor((row) => row.label ?? row.name, { header: "Nombre" }),
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/admin/roles/${row.original.id}/editar`} />}
          >
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
  onDelete,
}: {
  roles: Role[];
  onDelete: (role: Role) => void;
}) {
  return (
    <DataTable
      columns={buildColumns(onDelete)}
      data={roles}
      searchPlaceholder="Buscar rol..."
      emptyMessage="Sin roles."
    />
  );
}
