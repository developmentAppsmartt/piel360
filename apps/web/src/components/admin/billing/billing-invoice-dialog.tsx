"use client";

import { formatCOP } from "@/components/payments/subscription-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BillingPurchase } from "@/lib/queries/admin-billing";

const PAYOUT_LABELS: Record<string, string> = {
  dispersed: "dispersada",
  processing: "en proceso Wompi",
  pending: "pendiente",
  none: "—",
};

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <dt className="text-muted-foreground">
        {label}
        {hint ? <span className="block text-[11px]">{hint}</span> : null}
      </dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Desglose económico de una compra pagada: de dónde sale el neto de Piel360. */
export function BillingInvoiceDialog({
  purchase,
  onClose,
}: {
  purchase: BillingPurchase | null;
  onClose: () => void;
}) {
  const inv = purchase?.invoice;
  return (
    <Dialog
      open={inv != null}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
    >
      <DialogContent className="sm:max-w-md">
        {purchase && inv ? (
          <>
            <DialogHeader>
              <DialogTitle>{purchase.plan.name}</DialogTitle>
              <DialogDescription>
                {purchase.user.name} · {purchase.user.email}
                {inv.wompiTransactionId
                  ? ` · Wompi ${inv.wompiTransactionId}`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <dl className="text-sm">
              <Row
                label="Bruto cobrado"
                value={formatCOP(inv.grossAmount)}
                hint={
                  inv.ivaAmount > 0
                    ? `IVA ${formatCOP(inv.ivaAmount)}`
                    : undefined
                }
              />
              <Row
                label="Fee pasarela"
                value={formatCOP(inv.gatewayFeeAmount)}
                hint={`${inv.gatewayFeePercent}%`}
              />
              <Row
                label="Gastos operativos"
                value={formatCOP(inv.operationalCostAmount)}
                hint={
                  inv.operationalCostPercent > 0
                    ? `Op. ${inv.operationalCostPercent}%`
                    : undefined
                }
              />
              {inv.apiTokenCostAmount > 0 ? (
                <Row
                  label="Costo API"
                  value={formatCOP(inv.apiTokenCostAmount)}
                />
              ) : null}
              <Row
                label="Base comisión"
                value={formatCOP(inv.commissionBaseAmount)}
              />
              <Row
                label={
                  inv.isReferredSale
                    ? `Comisión aliada${purchase.organization ? ` · ${purchase.organization.name}` : ""}`
                    : "Comisión aliada"
                }
                value={
                  inv.isReferredSale
                    ? formatCOP(inv.alliedCommissionAmount)
                    : "—"
                }
                hint={
                  inv.isReferredSale
                    ? `${inv.alliedCommissionPercent ?? 0}% · ${PAYOUT_LABELS[inv.alliedPayoutStatus] ?? "—"}`
                    : "Venta común"
                }
              />
              <Row
                label="Neto Piel360"
                value={formatCOP(inv.platformNetAmount)}
              />
            </dl>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
