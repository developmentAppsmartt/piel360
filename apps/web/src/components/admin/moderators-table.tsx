"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import type { Moderator } from "@/lib/queries/moderators";
import { useDeleteModerator } from "@/lib/queries/moderators";

const columnHelper = createColumnHelper<Moderator>();

export function ModeratorsTable({ moderators }: { moderators: Moderator[] }) {
  const remove = useDeleteModerator();

  const columns = [
    columnHelper.accessor((row) => row.user.email, {
      id: "email",
      header: "Correo",
    }),
    columnHelper.accessor("firstName", { header: "Nombre" }),
    columnHelper.accessor("lastName", { header: "Apellidos" }),
    columnHelper.accessor(
      (row) =>
        row.docType && row.docNumber
          ? `${row.docType} ${row.docNumber}`
          : (row.docNumber ?? "—"),
      { id: "doc", header: "Documento" },
    ),
    columnHelper.accessor("phone", {
      header: "Teléfono",
      cell: (info) => info.getValue() ?? "—",
    }),
    columnHelper.accessor("createdAt", {
      header: "Creado",
      cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={remove.isPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (
              confirm(
                `¿Eliminar moderador ${row.original.firstName} ${row.original.lastName}?`,
              )
            ) {
              void remove.mutateAsync(row.original.id);
            }
          }}
        >
          Eliminar
        </Button>
      ),
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={moderators}
      searchPlaceholder="Buscar moderador…"
      emptyMessage="Sin moderadores. Crea el primero."
    />
  );
}

export function ModeratorsHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Moderadores</h1>
        <p className="text-sm text-muted-foreground">
          Cuentas con acceso al módulo de verificación de doctores.
        </p>
      </div>
      <Link
        href="/admin/moderadores/nuevo"
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Crear moderador
      </Link>
    </div>
  );
}
