import { toInternalProviderSlug } from "@piel360/shared";
import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import type { Subscription } from "@/lib/queries/subscriptions";

/** Valor cobrado: factura interna (incluye IVA) o, si no existe, precio del plan. */
export function subscriptionAmount(sub: Subscription): number {
  const value = Number(sub.invoice?.grossAmount ?? sub.plan.price);
  return Number.isFinite(value) ? value : 0;
}

export function subscriptionPurchaseDate(sub: Subscription): string {
  return sub.invoice?.createdAt ?? sub.createdAt;
}

export type PlanKind = "both" | "derm" | "aesthetic" | "fototipo" | "other";

export function subscriptionPlanKind(sub: Subscription): PlanKind {
  const limits = sub.plan.analysisLimits ?? {};
  const derm = (limits.skiniver ?? 0) > 0;
  const aesthetic = (limits.aesthetic ?? 0) > 0;
  if (derm && aesthetic) return "both";
  if (derm) return "derm";
  if (aesthetic) return "aesthetic";
  const slug = toInternalProviderSlug(sub.plan.provider.slug);
  if (slug === "skiniver") return "derm";
  if (slug === "youcam") return "aesthetic";
  if (slug === "fitzpatrick") return "fototipo";
  return "other";
}

export function subscriptionPlanSubtitle(sub: Subscription): string {
  switch (subscriptionPlanKind(sub)) {
    case "both":
      return "Análisis estético + dermatológico";
    case "derm":
      return "Análisis dermatológico";
    case "aesthetic":
      return "Análisis estético";
    case "fototipo":
      return "Análisis de fototipo";
    default:
      return providerLabel(sub.plan.provider.slug, sub.plan.provider.name);
  }
}

export function subscriptionPlanIncludes(sub: Subscription): string {
  const description = sub.plan.description?.trim();
  if (description) return description;
  const features = (sub.plan.features ?? []).filter((f) => f.included).map((f) => f.label);
  return features.length > 0 ? features.join(" · ") : subscriptionPlanSubtitle(sub);
}

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

/** Oculta nombres de proveedor (Skiniver / YouCam / Perfect Corp) en textos al usuario. */
export function maskVendorPoolMessage(message: string): string {
  return message
    .replace(/\bPerfect\s*Corp\b/gi, "Análisis Estético Piel 360")
    .replace(/\bPerfectCorp\b/gi, "Análisis Estético Piel 360")
    .replace(/\bYouCam\b/gi, "Análisis Estético Piel 360")
    .replace(/\bYoucam\b/gi, "Análisis Estético Piel 360")
    .replace(/\bSkiniver\b/gi, "Análisis Dermatológico Piel 360");
}

export function formatAdminDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type SubscriptionEndsAtInput = Pick<Subscription, "endsAt" | "createdAt" | "status"> & {
  plan: Pick<Subscription["plan"], "durationDays">;
};

/**
 * Fecha de vigencia: `endsAt` guardado o fecha de compra + duración del plan.
 * `null` cuando el plan no tiene duración o la suscripción ya no corre.
 */
export function subscriptionEndsAtDate(sub: SubscriptionEndsAtInput): Date | null {
  const durationDays = Number(sub.plan?.durationDays ?? 0);
  if (durationDays <= 0) return null;

  if (sub.endsAt) {
    const parsed = new Date(sub.endsAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (sub.status !== "active" && sub.status !== "pending") return null;

  const purchaseDate = new Date(sub.createdAt);
  if (Number.isNaN(purchaseDate.getTime())) return null;

  const ends = new Date(purchaseDate);
  ends.setDate(ends.getDate() + durationDays);
  return ends;
}

/** Vigencia en texto, para mostrar. */
export function subscriptionEndsAtDisplay(sub: SubscriptionEndsAtInput): string {
  const ends = subscriptionEndsAtDate(sub);
  if (!ends) return "—";
  return ends.toLocaleDateString("es-CO", {
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

/**
 * Grupo con el que se presenta una suscripción. No es el `status` de la base:
 * "consumido" no existe allí y se deriva de los créditos y la vigencia.
 */
export type SubscriptionBucket = "active" | "consumed" | "pending" | "cancelled";

/** Orden en que se muestran los grupos (pendientes antes que cancelados: ahí sí puede actuar). */
export const SUBSCRIPTION_BUCKETS: SubscriptionBucket[] = [
  "active",
  "consumed",
  "pending",
  "cancelled",
];

export const SUBSCRIPTION_BUCKET_LABELS: Record<SubscriptionBucket, string> = {
  active: "Activos",
  consumed: "Consumidos",
  pending: "Pendientes",
  cancelled: "Cancelados",
};

/** Título de la sección de cada grupo. */
export const SUBSCRIPTION_BUCKET_HEADINGS: Record<SubscriptionBucket, string> = {
  active: "Planes activos (con créditos disponibles)",
  consumed: "Planes consumidos (sin créditos o vencidos)",
  pending: "Planes pendientes de pago",
  cancelled: "Planes cancelados",
};

/** Etiqueta del distintivo dentro de la ficha. */
export const SUBSCRIPTION_BUCKET_PILL_LABELS: Record<SubscriptionBucket, string> = {
  active: "Activo",
  consumed: "Consumido",
  pending: "Pendiente",
  cancelled: "Cancelado",
};

/**
 * El orden de las reglas importa: una cancelada sin créditos es cancelada, no
 * consumida.
 */
export function subscriptionBucket(
  sub: Pick<Subscription, "status" | "remainingCredits" | "endsAt" | "createdAt"> & {
    plan: Pick<Subscription["plan"], "durationDays">;
  },
  now: Date = new Date(),
): SubscriptionBucket {
  if (sub.status === "cancelled") return "cancelled";
  if (sub.status === "pending") return "pending";
  if (sub.remainingCredits <= 0) return "consumed";
  const ends = subscriptionEndsAtDate(sub);
  if (ends && ends.getTime() < now.getTime()) return "consumed";
  return "active";
}
