"use client";

import { CalendarDays, ChevronRight, CreditCard, Receipt } from "lucide-react";
import {
  formatAdminDate,
  formatCOP,
  providerLabel,
  SUBSCRIPTION_STATUS_LABELS,
  subscriptionEndsAtDisplay,
  subscriptionUsage,
} from "@/components/payments/subscription-utils";
import type { Subscription } from "@/lib/queries/subscriptions";
import { useMySubscriptions } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";

function StatusPill({ status }: { status: Subscription["status"] }) {
  const label = SUBSCRIPTION_STATUS_LABELS[status] ?? status;
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-700">
        {label}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-amber-700">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-rose-600">
      {label}
    </span>
  );
}

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
        {rows.map((sub) => {
          const { used, percent } = subscriptionUsage(sub);
          const interactive = Boolean(onSelect);
          return (
            <li key={sub.id}>
              <button
                type="button"
                disabled={!interactive}
                onClick={interactive ? () => onSelect?.(sub) : undefined}
                className={cn(
                  "flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors sm:flex-row sm:items-center sm:gap-5 sm:px-5",
                  interactive && "hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:outline-none",
                  !interactive && "cursor-default",
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CreditCard className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{sub.plan.name}</p>
                      <StatusPill status={sub.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {providerLabel(sub.plan.provider.slug, sub.plan.provider.name)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden />
                        {formatAdminDate(sub.createdAt)}
                      </span>
                      {sub.status === "active" ? (
                        <span>
                          Vigencia hasta {subscriptionEndsAtDisplay(sub)}
                        </span>
                      ) : null}
                      {sub.plan.analysisLimit > 0 ? (
                        <span className="tabular-nums">
                          {used}/{sub.plan.analysisLimit} créditos · {Math.round(percent)}%
                        </span>
                      ) : null}
                    </div>
                    {sub.wompiTransactionId ? (
                      <p className="truncate font-mono text-[11px] text-muted-foreground/80">
                        Ref. {sub.wompiTransactionId}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
                  <p className="text-base font-semibold tabular-nums tracking-tight text-foreground">
                    {formatCOP(sub.plan.price)}
                  </p>
                  {interactive ? (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
                      Ver detalle
                      <ChevronRight className="size-3.5" aria-hidden />
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {onSelect ? (
        <p className="border-t border-border/70 bg-muted/20 px-5 py-2.5 text-xs text-muted-foreground">
          Toca una compra para ver el detalle y la referencia de pago.
        </p>
      ) : null}
    </div>
  );
}
