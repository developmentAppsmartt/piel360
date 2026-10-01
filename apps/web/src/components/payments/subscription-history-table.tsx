"use client";

import { Receipt } from "lucide-react";
import { SubscriptionCard } from "@/components/payments/subscription-card";
import type { Subscription } from "@/lib/queries/subscriptions";
import { useMySubscriptions } from "@/lib/queries/subscriptions";

/** Historial de compras — `GET /me/subscriptions`. */
export function SubscriptionHistoryTable({
  limit,
  onSelect,
}: {
  limit?: number;
  onSelect?: (subscription: Subscription) => void;
}) {
  const subscriptions = useMySubscriptions();
  const rows = limit ? subscriptions.data?.slice(0, limit) : subscriptions.data;

  if (subscriptions.isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-2xl border border-border/60 bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/15 px-6 py-12 text-center">
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Receipt className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-medium text-foreground">Aún no tienes compras registradas</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando contrates un plan, aparecerá aquí con su referencia de pago.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <ul className="divide-y divide-border/70">
        {rows.map((sub) => (
          <li key={sub.id}>
            <SubscriptionCard subscription={sub} onSelect={onSelect} />
          </li>
        ))}
      </ul>
      {onSelect ? (
        <p className="border-t border-border/70 bg-muted/20 px-5 py-2.5 text-xs text-muted-foreground">
          Toca una compra para ver el detalle y la referencia de pago.
        </p>
      ) : null}
    </div>
  );
}
