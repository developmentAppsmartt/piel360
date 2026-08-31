import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import type { Subscription } from "@/lib/queries/subscriptions";

export const SUBSCRIPTION_STATUS_LABELS: Record<Subscription["status"], string> = {
  active: "Activa",
  pending: "Pendiente",
  cancelled: "Cancelada",
};

export function formatCOP(price: string | number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

export function providerLabel(slug: string, fallbackName?: string) {
  const fromMap = (ANALYSIS_PROVIDER_STATIC_LABELS as Record<string, string>)[slug];
  return fromMap ?? fallbackName ?? slug;
}

export function formatAdminDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAdminDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function subscriptionUsage(sub: Subscription) {
  const used = Math.max(0, sub.plan.analysisLimit - sub.remainingCredits);
  const percent =
    sub.plan.analysisLimit > 0 ? Math.min(100, (used / sub.plan.analysisLimit) * 100) : 0;
  return { used, percent };
}
