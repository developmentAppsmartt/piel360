"use client";

import { AnalysisConsumptionView } from "@/components/analyses/analysis-consumption-view";
import { MOCK_COMPANY_CONSUMPTION } from "@/lib/mocks/admin-bolsa";
import { useMySubscriptions } from "@/lib/queries/subscriptions";

function poolFromSubs(
  subscriptions: ReturnType<typeof useMySubscriptions>["data"],
  category: "estetico" | "dermatologico",
  fallback: { done: number; limit: number; available: number },
) {
  const sub = subscriptions?.find(
    (s) => s.status === "active" && s.plan.provider.category === category,
  );
  if (!sub) return fallback;
  const done = Math.max(0, sub.plan.analysisLimit - sub.remainingCredits);
  return {
    done,
    limit: sub.plan.analysisLimit,
    available: sub.remainingCredits,
  };
}

export default function ConsumoPage() {
  const subscriptions = useMySubscriptions();
  const mock = MOCK_COMPANY_CONSUMPTION;

  if (subscriptions.isLoading) {
    return <p className="text-muted-foreground">Cargando consumo...</p>;
  }

  const aesthetic = poolFromSubs(subscriptions.data, "estetico", mock.aesthetic);
  const derm = poolFromSubs(subscriptions.data, "dermatologico", mock.derm);

  return (
    <AnalysisConsumptionView
      aesthetic={aesthetic}
      derm={derm}
      daily={mock.daily}
      rows={mock.rows}
    />
  );
}
