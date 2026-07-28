"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { SubscriptionAdmin } from "@/lib/queries/subscriptions";

const STATUS_BADGE: Record<SubscriptionAdmin["status"], { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Activo", variant: "default" },
  pending: { label: "Pendiente", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const columnHelper = createColumnHelper<SubscriptionAdmin>();

function buildColumns(
  onEdit: (subscription: SubscriptionAdmin) => void,
  onDelete: (subscription: SubscriptionAdmin) => void,
) {
  return [
    columnHelper.accessor((row) => `${row.user.name} (${row.user.email})`, {
      id: "user",
      header: "Usuario",
    }),
    columnHelper.accessor((row) => `${row.plan.name} (${row.plan.provider.name})`, {
      id: "plan",
      header: "Plan",
    }),
    columnHelper.accessor("status", {
      header: "Estado",
      cell: (info) => {
        const badge = STATUS_BADGE[info.getValue()];
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    }),
    columnHelper.accessor("endsAt", {
      header: "Finaliza el",
      cell: (info) => {
        const value = info.getValue();
        return value ? new Date(value).toLocaleDateString("es-CO") : "—";
      },
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

export function SubscriptionsTable({
  subscriptions,
  onEdit,
  onDelete,
}: {
  subscriptions: SubscriptionAdmin[];
  onEdit: (subscription: SubscriptionAdmin) => void;
  onDelete: (subscription: SubscriptionAdmin) => void;
}) {
  return (
    <DataTable
      columns={buildColumns(onEdit, onDelete)}
      data={subscriptions}
      searchPlaceholder="Buscar por usuario o plan..."
      emptyMessage="Sin suscripciones."
    />
  );
}
