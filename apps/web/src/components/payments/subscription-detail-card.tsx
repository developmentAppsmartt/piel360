"use client";

import {
  CalendarDays,
  CreditCard,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import type { Subscription } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";
import { PlanTeamFeaturesBlock } from "./plan-features-display";
import {
  formatAdminDate,
  formatCOP,
  providerLabel,
  SUBSCRIPTION_STATUS_LABELS,
  subscriptionUsage,
} from "./subscription-utils";

function StatusBadge({ status }: { status: Subscription["status"] }) {
  if (status === "active") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        {SUBSCRIPTION_STATUS_LABELS.active}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        {SUBSCRIPTION_STATUS_LABELS.pending}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
      {SUBSCRIPTION_STATUS_LABELS.cancelled}
    </span>
  );
}

export function SubscriptionDetailCard({
  subscription,
  onViewDetail,
  className,
  showTeamFeatures = false,
}: {
  subscription: Subscription;
  onViewDetail?: () => void;
  className?: string;
  /** Muestra cupos de equipo y especialidades (membresía empresa). */
  showTeamFeatures?: boolean;
}) {
  const { used, percent } = subscriptionUsage(subscription);
  const slug = subscription.plan.provider.slug;

  return (
    <ModuleCard className={cn("flex h-full flex-col gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-foreground">{subscription.plan.name}</p>
            <p className="text-sm text-muted-foreground">
              {providerLabel(slug, subscription.plan.provider.name)}
            </p>
          </div>
        </div>
        <StatusBadge status={subscription.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Créditos restantes</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            {subscription.remainingCredits}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {subscription.plan.analysisLimit}
            </span>
          </p>
        </div>
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Vigencia</p>
          <p className="mt-1 font-medium text-foreground">
            {formatAdminDate(subscription.endsAt)}
          </p>
        </div>
      </div>

      {showTeamFeatures ? (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
            <Users className="size-3.5" aria-hidden />
            Equipo y especialidades
          </p>
          <PlanTeamFeaturesBlock plan={subscription.plan} compact />
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="size-3.5" aria-hidden />
            {used} usados
          </span>
          <span>{Math.round(percent)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <CreditCard className="size-4" aria-hidden />
          {formatCOP(subscription.plan.price)}
        </span>
        {onViewDetail ? (
          <Button type="button" variant="outline" size="sm" onClick={onViewDetail}>
            Ver detalle
          </Button>
        ) : null}
      </div>
    </ModuleCard>
  );
}

export function SubscriptionSummaryMetrics({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const active = subscriptions.filter((s) => s.status === "active");
  const creditsLeft = active.reduce((sum, s) => sum + s.remainingCredits, 0);
  const totalSpent = subscriptions
    .filter((s) => s.status !== "cancelled")
    .reduce((sum, s) => sum + Number(s.plan.price), 0);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ModuleCard className="p-4">
        <p className="text-xs font-medium text-muted-foreground">Suscripciones activas</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{active.length}</p>
      </ModuleCard>
      <ModuleCard className="p-4">
        <p className="text-xs font-medium text-muted-foreground">Créditos disponibles</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{creditsLeft}</p>
      </ModuleCard>
      <ModuleCard className="p-4">
        <p className="text-xs font-medium text-muted-foreground">Total invertido</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{formatCOP(totalSpent)}</p>
      </ModuleCard>
    </div>
  );
}

export function SubscriptionDetailBody({
  subscription,
  showTeamFeatures = false,
}: {
  subscription: Subscription;
  showTeamFeatures?: boolean;
}) {
  const { used, percent } = subscriptionUsage(subscription);
  const slug = subscription.plan.provider.slug;

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-foreground">{subscription.plan.name}</p>
          <p className="text-muted-foreground">
            {providerLabel(slug, subscription.plan.provider.name)}
          </p>
        </div>
        <StatusBadge status={subscription.status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Monto pagado</p>
          <p className="mt-1 text-lg font-semibold">{formatCOP(subscription.plan.price)}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Duración del plan</p>
          <p className="mt-1 font-medium">{subscription.plan.durationDays} días</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            Fecha de compra
          </p>
          <p className="mt-1 font-medium">{formatAdminDate(subscription.createdAt)}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            Vence
          </p>
          <p className="mt-1 font-medium">{formatAdminDate(subscription.endsAt)}</p>
        </div>
      </div>

      {showTeamFeatures ? (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
          <p className="mb-3 font-medium text-foreground">Equipo y especialidades del plan</p>
          <PlanTeamFeaturesBlock plan={subscription.plan} />
        </div>
      ) : null}

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-foreground">Consumo de análisis</p>
          <p className="text-muted-foreground">
            {used} de {subscription.plan.analysisLimit} usados
          </p>
        </div>
        <div className="mt-3 h-2.5 w-full rounded-full bg-muted">
          <div
            className="h-2.5 rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {subscription.remainingCredits} créditos disponibles para nuevos análisis.
        </p>
      </div>

      <div className="rounded-xl bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground">Referencia de pago (Wompi)</p>
        <p className="mt-1 font-mono text-xs break-all">
          {subscription.wompiTransactionId ?? "Asignación manual / sin referencia"}
        </p>
      </div>
    </div>
  );
}
