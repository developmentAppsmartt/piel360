import {
  subscriptionBucket,
  type SubscriptionBucket,
} from "@/components/payments/subscription-utils";
import type { Subscription } from "@/lib/queries/subscriptions";

/** Paleta por grupo: tarjeta, distintivo, punto y barra comparten tono. */
export const BILLING_THEME: Record<
  SubscriptionBucket,
  {
    card: string;
    pill: string;
    dot: string;
    bar: string;
    text: string;
    soft: string;
    icon: string;
  }
> = {
  active: {
    card: "border-emerald-200 bg-emerald-50/60",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    soft: "bg-emerald-100/70",
    icon: "bg-emerald-100 text-emerald-700",
  },
  consumed: {
    card: "border-amber-200 bg-amber-50/60",
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    text: "text-amber-700",
    soft: "bg-amber-100/70",
    icon: "bg-amber-100 text-amber-700",
  },
  pending: {
    card: "border-sky-200 bg-sky-50/60",
    pill: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
    text: "text-sky-700",
    soft: "bg-sky-100/70",
    icon: "bg-sky-100 text-sky-700",
  },
  cancelled: {
    card: "border-rose-200 bg-rose-50/60",
    pill: "border-rose-200 bg-rose-50 text-rose-600",
    dot: "bg-rose-500",
    bar: "bg-rose-400",
    text: "text-rose-600",
    soft: "bg-rose-100/70",
    icon: "bg-rose-100 text-rose-600",
  },
};

/** "Vencido" distingue al consumido por fecha del que gastó todos sus créditos. */
export function bucketPillLabel(sub: Subscription): string {
  const bucket = subscriptionBucket(sub);
  if (bucket === "active") return "Activo";
  if (bucket === "consumed") return sub.remainingCredits > 0 ? "Vencido" : "Consumido";
  if (bucket === "pending") return "Pendiente";
  return "Cancelado";
}

/** Créditos que se muestran: un plan cancelado o pendiente no tiene saldo usable. */
export function displayCredits(sub: Subscription) {
  const bucket = subscriptionBucket(sub);
  const total = Math.max(sub.plan.analysisLimit, 0);
  const left =
    bucket === "active" || bucket === "consumed"
      ? Math.min(Math.max(sub.remainingCredits, 0), total)
      : 0;
  const percent = total > 0 ? Math.round((left / total) * 100) : 0;
  return { left, total, percent };
}
