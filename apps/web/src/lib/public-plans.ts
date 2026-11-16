import type { PlanFeature } from "@piel360/shared";

/** Lo que devuelve `GET /public/plans` (plans/public-plans.service.ts). */
export type PublicPlan = {
  id: string;
  name: string;
  description: string | null;
  planType: "individual" | "business" | string;
  saleType: "aesthetic" | "derm" | "fototipo" | "mixed";
  customerPrice: number;
  durationDays: number;
  analysisLimit: number;
  maxUsers: number;
  features: PlanFeature[] | unknown;
  headerColor: string | null;
};

const API_URL = process.env.API_URL ?? "http://localhost:3000/api";

/** Catálogo para la landing, pedido en el servidor y cacheado una hora. Si el
 * API no responde, la landing se sirve igual sin precios. */
export async function fetchPublicPlans(): Promise<PublicPlan[]> {
  try {
    const res = await fetch(`${API_URL}/public/plans`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as PublicPlan[];
  } catch {
    return [];
  }
}

export function publicPlanFeatures(plan: PublicPlan): PlanFeature[] {
  if (!Array.isArray(plan.features)) return [];
  return (plan.features as PlanFeature[]).filter((f) => f?.label?.trim());
}

/** Pestaña de la landing: el fototipo se vende con la bolsa estética; un plan
 * mixto aparece en las dos. */
export function plansForTab(plans: PublicPlan[], tab: "aesthetic" | "derm"): PublicPlan[] {
  return plans.filter((plan) =>
    tab === "derm"
      ? plan.saleType === "derm" || plan.saleType === "mixed"
      : plan.saleType !== "derm",
  );
}
