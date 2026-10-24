"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type PlanSaleType = "aesthetic" | "derm" | "fototipo" | "mixed";
export type GoalPlanType = Exclude<PlanSaleType, "mixed">;
export type PurchaseStatus = "completed" | "pending" | "rejected" | "manual";
export type GoalStatus = "met" | "on_track" | "near" | "behind" | "none";

export type BillingInvoice = {
  id: string;
  isReferredSale: boolean;
  grossAmount: number;
  gatewayFeeAmount: number;
  gatewayFeePercent: number;
  netAfterGateway: number;
  operationalCostAmount: number;
  operationalCostPercent: number;
  apiTokenCostAmount: number;
  ivaAmount: number;
  commissionBaseAmount: number;
  alliedCommissionPercent: number | null;
  alliedCommissionAmount: number;
  platformNetAmount: number;
  alliedPayoutStatus: "none" | "pending" | "processing" | "dispersed";
  wompiTransactionId: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  plan: { id: string; name: string };
  organization: { id: string; name: string } | null;
};

export type BillingPurchase = {
  id: string;
  date: string;
  user: { id: string; name: string; email: string };
  organization: { id: string; name: string } | null;
  plan: { id: string; name: string };
  planType: PlanSaleType;
  credits: number;
  amount: number;
  status: PurchaseStatus;
  isReferredSale: boolean;
  invoice: BillingInvoice | null;
};

export type SalesGoalItem = {
  type: GoalPlanType;
  target: number | null;
  sold: number;
  percent: number;
  status: GoalStatus;
};

export type AdminBillingResponse = {
  range: { from: string; to: string };
  metrics: {
    invoiceCount: number;
    grossTotal: number;
    gatewayFeesTotal: number;
    platformNetTotal: number;
    alliedCommissionsTotal: number;
    alliedPendingTotal: number;
    alliedDispersedTotal: number;
    referredSalesCount: number;
    commonSalesCount: number;
    /** Comisiones pendientes de todas las fechas: lo que envía «Dispersar todas». */
    alliedPendingGlobal: number;
  };
  byType: {
    purchaseCount: number;
    grossTotal: number;
    counts: Record<PlanSaleType, number>;
  };
  purchases: BillingPurchase[];
  goals: { month: string; monthProgress: number; items: SalesGoalItem[] };
};

/** Filtros aplicados (los del formulario solo cuentan al pulsar «Aplicar»). */
export type BillingFilters = {
  from: string;
  to: string;
  planType: PlanSaleType | "all";
};

export const ADMIN_BILLING_KEY = ["admin", "billing"] as const;

export function useAdminBilling(filters: BillingFilters) {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.planType !== "all") params.set("planType", filters.planType);
  return useQuery({
    queryKey: [...ADMIN_BILLING_KEY, filters],
    queryFn: () =>
      apiClientFetch<AdminBillingResponse>(`/admin/billing?${params}`),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateSalesGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      input: { month: string } & Partial<Record<GoalPlanType, number>>,
    ) =>
      apiClientFetch<{ ok: true }>("/admin/billing/goals", {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_BILLING_KEY });
    },
  });
}
