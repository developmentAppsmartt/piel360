"use client";

import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  Microscope,
  ScanFace,
  Sparkles,
  SwatchBook,
} from "lucide-react";
import {
  formatAdminDate,
  formatCOP,
  subscriptionAmount,
  subscriptionBucket,
  subscriptionEndsAtDisplay,
  subscriptionPlanKind,
  subscriptionPlanSubtitle,
  type PlanKind,
} from "@/components/payments/subscription-utils";
import type { Subscription } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";
import { BILLING_THEME, bucketPillLabel, displayCredits } from "./billing-theme";

export function BillingStatusPill({ subscription }: { subscription: Subscription }) {
  const theme = BILLING_THEME[subscriptionBucket(subscription)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        theme.pill,
      )}
    >
      <span className={cn("size-1.5 rounded-full", theme.dot)} aria-hidden />
      {bucketPillLabel(subscription)}
    </span>
  );
}

export function BillingCreditsBar({
  subscription,
  showNumbers = true,
}: {
  subscription: Subscription;
  showNumbers?: boolean;
}) {
  const theme = BILLING_THEME[subscriptionBucket(subscription)];
  const { left, total, percent } = displayCredits(subscription);
  return (
    <div className="space-y-1">
      {showNumbers ? (
        <p className="text-sm font-bold tabular-nums text-foreground">
          {left}
          <span className="font-normal text-muted-foreground"> / {total}</span>
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-white/80 ring-1 ring-border/60"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${left} de ${total} créditos disponibles`}
        >
          <div className={cn("h-full rounded-full", theme.bar)} style={{ width: `${percent}%` }} />
        </div>
        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
          {percent}%
        </span>
      </div>
    </div>
  );
}

export function BillingPlanAvatar({
  subscription,
  size = "md",
}: {
  subscription: Subscription;
  size?: "md" | "lg";
}) {
  const bucket = subscriptionBucket(subscription);
  const cancelled = bucket === "cancelled";
  const iconClass = size === "lg" ? "size-8" : "size-6";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border",
        size === "lg" ? "size-16" : "size-12",
        cancelled
          ? "border-rose-200 bg-rose-50 text-rose-600"
          : "border-primary/15 bg-primary/5 text-primary",
      )}
    >
      {cancelled ? (
        <CreditCard className={iconClass} aria-hidden />
      ) : (
        <PlanKindIcon kind={subscriptionPlanKind(subscription)} className={iconClass} />
      )}
    </span>
  );
}

function PlanKindIcon({ kind, className }: { kind: PlanKind; className: string }) {
  switch (kind) {
    case "derm":
      return <Microscope className={className} aria-hidden />;
    case "aesthetic":
      return <Sparkles className={className} aria-hidden />;
    case "fototipo":
      return <SwatchBook className={className} aria-hidden />;
    default:
      return <ScanFace className={className} aria-hidden />;
  }
}

function rowDate(sub: Subscription): { label: string; value: string } {
  if (sub.status === "cancelled") {
    return { label: "Fecha de cancelación", value: formatAdminDate(sub.updatedAt ?? sub.createdAt) };
  }
  if (sub.status === "pending") {
    return { label: "Fecha de compra", value: formatAdminDate(sub.createdAt) };
  }
  return { label: "Vigencia", value: subscriptionEndsAtDisplay(sub) };
}

export function BillingPlanRow({
  subscription: sub,
  onSelect,
}: {
  subscription: Subscription;
  onSelect: (subscription: Subscription) => void;
}) {
  const theme = BILLING_THEME[subscriptionBucket(sub)];
  const date = rowDate(sub);

  return (
    <button
      type="button"
      onClick={() => onSelect(sub)}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
        theme.card,
      )}
    >
      <BillingPlanAvatar subscription={sub} />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-foreground">{sub.plan.name}</p>
          <BillingStatusPill subscription={sub} />
        </div>
        <p className="text-sm text-muted-foreground">{subscriptionPlanSubtitle(sub)}</p>
        <div className="max-w-md">
          <BillingCreditsBar subscription={sub} />
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
        <p className="text-base font-semibold tabular-nums text-foreground">
          {formatCOP(subscriptionAmount(sub))}
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          <span>
            {date.label}
            <span className="block font-medium text-foreground">{date.value}</span>
          </span>
        </span>
      </div>

      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
