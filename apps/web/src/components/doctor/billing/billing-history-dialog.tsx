"use client";

import { Download } from "lucide-react";
import {
  formatAdminDate,
  formatCOP,
  subscriptionAmount,
  subscriptionBucket,
  subscriptionPlanSubtitle,
  subscriptionPurchaseDate,
} from "@/components/payments/subscription-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Subscription } from "@/lib/queries/subscriptions";
import { BillingStatusPill } from "./billing-plan-row";
import { printReceipt, receiptReference } from "./billing-receipt";

export function BillingHistoryDialog({
  subscriptions,
  open,
  onOpenChange,
  customerName,
}: {
  subscriptions: Subscription[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string | null;
}) {
  const ordered = [...subscriptions].sort(
    (a, b) =>
      new Date(subscriptionPurchaseDate(b)).getTime() -
      new Date(subscriptionPurchaseDate(a)).getTime(),
  );
  const paidTotal = ordered
    .filter((sub) => {
      const bucket = subscriptionBucket(sub);
      return bucket === "active" || bucket === "consumed";
    })
    .reduce((sum, sub) => sum + subscriptionAmount(sub), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de facturación</DialogTitle>
          <DialogDescription>
            Todas tus compras de planes con su referencia de pago. Los cobros se procesan con
            Wompi.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-primary">Total pagado</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{formatCOP(paidTotal)}</p>
          <p className="text-xs text-muted-foreground">
            {ordered.length} {ordered.length === 1 ? "compra registrada" : "compras registradas"}
          </p>
        </div>

        {ordered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay compras registradas.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium">Plan</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2 text-left font-medium">Estado</th>
                  <th className="px-3 py-2" aria-label="Comprobante" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {ordered.map((sub) => (
                  <tr key={sub.id} className="align-top">
                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                      {formatAdminDate(subscriptionPurchaseDate(sub))}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-foreground">{sub.plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {subscriptionPlanSubtitle(sub)}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground/80">
                        Ref. {receiptReference(sub)}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap">
                      {formatCOP(subscriptionAmount(sub))}
                    </td>
                    <td className="px-3 py-3">
                      <BillingStatusPill subscription={sub} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      {sub.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => printReceipt(sub, customerName)}
                          className="inline-flex size-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                          aria-label={`Ver comprobante de ${sub.plan.name}`}
                          title="Ver comprobante"
                        >
                          <Download className="size-4" aria-hidden />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
