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
import { useMySubscriptions } from "@/lib/queries/subscriptions";

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  pending: "Pendiente",
  cancelled: "Cancelada",
};

function formatCOP(price: string) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(price),
  );
}

/** Historial de compras/facturación — mismos datos (`GET /me/subscriptions`)
 * usados tanto en /doctor/facturacion (página completa) como en
 * /patient/planes (versión compacta bajo el selector de planes). */
export function SubscriptionHistoryTable({ limit }: { limit?: number }) {
  const subscriptions = useMySubscriptions();
  const rows = limit ? subscriptions.data?.slice(0, limit) : subscriptions.data;

  if (subscriptions.isLoading) return <p className="text-muted-foreground">Cargando historial...</p>;
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no tienes compras registradas.</p>;
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Referencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell>{new Date(sub.createdAt).toLocaleDateString("es-CO")}</TableCell>
              <TableCell>{sub.plan.name}</TableCell>
              <TableCell>{sub.plan.provider.name}</TableCell>
              <TableCell>{formatCOP(sub.plan.price)}</TableCell>
              <TableCell>
                <Badge variant={sub.status === "active" ? "default" : sub.status === "pending" ? "secondary" : "destructive"}>
                  {STATUS_LABELS[sub.status] ?? sub.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{sub.wompiTransactionId ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
