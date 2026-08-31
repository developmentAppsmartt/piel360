"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatAdminDate,
  formatCOP,
  providerLabel,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/components/payments/subscription-utils";
import type { Subscription } from "@/lib/queries/subscriptions";
import { useMySubscriptions } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";

/** Historial de compras/facturación — mismos datos (`GET /me/subscriptions`)
 * usados tanto en /doctor/facturacion (página completa) como en
 * /patient/planes (versión compacta bajo el selector de planes). */
export function SubscriptionHistoryTable({
  limit,
  onSelect,
}: {
  limit?: number;
  onSelect?: (subscription: Subscription) => void;
}) {
  const subscriptions = useMySubscriptions();
  const rows = limit ? subscriptions.data?.slice(0, limit) : subscriptions.data;

  if (subscriptions.isLoading) return <p className="text-muted-foreground">Cargando historial...</p>;
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no tienes compras registradas.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead>Fecha</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Tipo de análisis</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Referencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((sub) => (
            <TableRow
              key={sub.id}
              className={cn(onSelect && "cursor-pointer hover:bg-muted/40")}
              onClick={onSelect ? () => onSelect(sub) : undefined}
            >
              <TableCell>{formatAdminDate(sub.createdAt)}</TableCell>
              <TableCell className="font-medium">{sub.plan.name}</TableCell>
              <TableCell>
                {providerLabel(sub.plan.provider.slug, sub.plan.provider.name)}
              </TableCell>
              <TableCell>{formatCOP(sub.plan.price)}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    sub.status === "active"
                      ? "default"
                      : sub.status === "pending"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[140px] truncate font-mono text-xs">
                {sub.wompiTransactionId ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {onSelect ? (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Haz clic en una fila para ver el detalle de la compra.
        </p>
      ) : null}
    </div>
  );
}
