"use client";

import { CalendarDays, ChevronRight, CreditCard } from "lucide-react";
import {
  formatAdminDate,
  formatCOP,
  providerLabel,
  subscriptionBucket,
  SUBSCRIPTION_BUCKET_PILL_LABELS,
  subscriptionEndsAtDisplay,
  subscriptionUsage,
  type SubscriptionBucket,
} from "@/components/payments/subscription-utils";
import type { Subscription } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";

/** Color por grupo — se usa igual en el distintivo, el punto y la barra. */
export const BUCKET_STYLES: Record<
  SubscriptionBucket,
  { pill: string; dot: string; bar: string }
> = {
  active: {
    pill: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  consumed: {
    pill: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  pending: {
    pill: "bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  cancelled: {
    pill: "bg-rose-50 text-rose-600",
    dot: "bg-rose-500",
    bar: "bg-rose-400",
  },
};

function BucketPill({ bucket, expired }: { bucket: SubscriptionBucket; expired?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        BUCKET_STYLES[bucket].pill,
      )}
    >
      {expired ? "Vencido" : SUBSCRIPTION_BUCKET_PILL_LABELS[bucket]}
    </span>
  );
}

/**
 * Ficha de una suscripción comprada. La comparten el historial de compras del
 * paciente y el listado agrupado de "Compras y facturación" del profesional.
 */
export function SubscriptionCard({
  subscription: sub,
  onSelect,
}: {
  subscription: Subscription;
  onSelect?: (subscription: Subscription) => void;
}) {
  const { used } = subscriptionUsage(sub);
  const bucket = subscriptionBucket(sub);
  const interactive = Boolean(onSelect);
  // Dentro del grupo "consumidos" conviven dos cosas distintas: el que gastó
  // todos sus créditos y el que caducó con créditos sin usar. Decir "consumido"
  // del segundo sería falso.
  const expired = bucket === "consumed" && sub.remainingCredits > 0;
  // En los consumidos interesa cuánto se gastó; en los demás, cuánto queda. En un
  // plan cancelado los créditos restantes ya no se pueden usar, así que no se
  // anuncian como "disponibles".
  const creditsLabel = expired
    ? "Créditos sin usar"
    : bucket === "consumed"
      ? "Créditos utilizados"
      : bucket === "cancelled"
        ? "Créditos"
        : "Créditos disponibles";
  const creditsValue = expired || bucket !== "consumed" ? sub.remainingCredits : used;
  // El porcentaje y la barra describen la cifra que está escrita al lado; si no,
  // se lee "100/100 disponibles · 0 %".
  const percent =
    sub.plan.analysisLimit > 0
      ? Math.min(100, Math.max(0, (creditsValue / sub.plan.analysisLimit) * 100))
      : 0;

  return (
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
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-foreground">{sub.plan.name}</p>
            <BucketPill bucket={bucket} expired={expired} />
          </div>
          <p className="text-sm text-muted-foreground">
            {providerLabel(sub.plan.provider.slug, sub.plan.provider.name)}
          </p>

          {sub.plan.analysisLimit > 0 ? (
            <div className="max-w-xs pt-1">
              <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <span>{creditsLabel}</span>
                <span className="tabular-nums">{Math.round(percent)}%</span>
              </div>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {creditsValue}/{sub.plan.analysisLimit}
              </p>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={Math.round(percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${used} de ${sub.plan.analysisLimit} créditos utilizados`}
              >
                <div
                  className={cn("h-full rounded-full", BUCKET_STYLES[bucket].bar)}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {formatAdminDate(sub.createdAt)}
            </span>
            {bucket === "active" || bucket === "pending" ? (
              <span>Vigencia hasta {subscriptionEndsAtDisplay(sub)}</span>
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
            Ver detalles
            <ChevronRight className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
    </button>
  );
}
