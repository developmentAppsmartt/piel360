"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { AdminUser } from "@/lib/queries/users";

const columnHelper = createColumnHelper<AdminUser>();

const columns = [
  columnHelper.accessor("name", { header: "Nombre" }),
  columnHelper.accessor("email", { header: "Correo electrónico" }),
  columnHelper.accessor((row) => row.roles.map((r) => r.name).join(", "), {
    id: "roles",
    header: "Roles",
    cell: (info) => {
      const roles = info.row.original.roles;
      if (roles.length === 0) return "—";
      return (
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <Badge key={role.name} variant="outline">
              {role.name}
            </Badge>
          ))}
        </div>
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Creado el",
    cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
  }),
];

export function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <DataTable
      columns={columns}
      data={users}
      searchPlaceholder="Buscar usuario..."
      emptyMessage="Sin usuarios."
    />
  );
}
