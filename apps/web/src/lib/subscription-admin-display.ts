import type { SubscriptionAdmin } from "@/lib/queries/subscriptions";

const ACCOUNT_KIND_LABELS: Record<SubscriptionAdmin["user"]["accountKind"], string> = {
  empresa: "Empresa",
  profesional: "Profesional",
  paciente: "Paciente",
};

export function subscriptionAccountKindLabel(
  kind: SubscriptionAdmin["user"]["accountKind"],
): string {
  return ACCOUNT_KIND_LABELS[kind];
}

export function subscriptionProviderLabels(plan: SubscriptionAdmin["plan"]): string {
  const providers = plan.providers?.length
    ? plan.providers
    : plan.provider
      ? [plan.provider]
      : [];
  return providers
    .map((provider) => provider.displayLabel ?? provider.name)
    .join(" · ");
}

export function subscriptionPackageSummary(plan: SubscriptionAdmin["plan"]): string {
  const providers = subscriptionProviderLabels(plan);
  if (plan.planType === "business") {
    return `${plan.name} · Paquete ${plan.maxUsers} usuario${plan.maxUsers === 1 ? "" : "s"}${providers ? ` · ${providers}` : ""}`;
  }
  return `${plan.name} · ${plan.analysisLimit} análisis${providers ? ` · ${providers}` : ""}`;
}

export function subscriptionPurchaserLabel(user: SubscriptionAdmin["user"]): string {
  return `${user.name} — ${user.email} (${subscriptionAccountKindLabel(user.accountKind)})`;
}

export function userMatchesPlanType(
  accountKind: SubscriptionAdmin["user"]["accountKind"],
  planType: SubscriptionAdmin["plan"]["planType"],
): boolean {
  if (planType === "business") return accountKind === "empresa";
  return accountKind === "profesional" || accountKind === "paciente";
}
