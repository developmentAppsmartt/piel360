"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type PerfectCorpUnitPool = {
  id: "aesthetic";
  name: string;
  accent: "aesthetic";
  available: number;
  total: number;
  used: number;
  reserved: number;
  expiringSoon: number;
  unitLabel: "unidades";
  rechargedRecent: number;
};

export type PerfectCorpFeatureCostRow = {
  description: string;
  amount: number;
  runTaskUrl: string;
};

export type PerfectCorpUnitsResponse = {
  source: "perfectcorp";
  fetchedAt: string;
  pool: PerfectCorpUnitPool;
  balances: Array<{
    id: string;
    type: string;
    amount: number;
    expiry: string | null;
  }>;
  featureCosts: {
    skinAnalysis: PerfectCorpFeatureCostRow[];
    fitzpatrick: PerfectCorpFeatureCostRow[];
    estimatedPerAnalysis: {
      youcamHdUnits: number;
      youcamConcerns: number;
      fitzpatrickUnits: number;
      combinedUnits: number;
      source: "api" | "fallback";
    };
  };
  history: Array<{
    id: string;
    action: string;
    delta: number;
    timestamp: string | null;
    targetId: string | null;
    dstActions: string[];
  }>;
};

export type SkiniverUnitPool = {
  id: "derm";
  name: string;
  accent: "derm";
  available: number;
  total: number;
  used: number;
  reserved: number;
  expiringSoon: number;
  unitLabel: "créditos";
};

export type SkiniverUnitsResponse = {
  source: "skiniver";
  fetchedAt: string;
  providerConfigured: boolean;
  pool: SkiniverUnitPool;
  history: Array<{
    id: string;
    quantity: number;
    expiresAt: string | null;
    note: string | null;
    createdAt: string;
    addedBy: string;
    addedByEmail: string | null;
  }>;
};

export type CreateSkiniverRechargeInput = {
  quantity: number;
  expiresAt?: string;
  note?: string;
};

export type PlanPoolAlertPlan = {
  id: string;
  name: string;
  analysisLimit: number;
  poolProvider: "skiniver" | "perfectcorp";
  poolAvailable: number;
  poolRequired: number;
  poolUnavailableReason: string | null;
  provider: { id: string; name: string; slug: string };
};

export type PlanPoolAlertsResponse = {
  fetchedAt: string;
  balances: { skiniver: number; perfectcorp: number };
  hasAlerts: boolean;
  unavailablePlans: PlanPoolAlertPlan[];
};

export function usePlanPoolAlerts() {
  return useQuery({
    queryKey: ["admin", "bolsa-unidades", "plan-alerts"],
    queryFn: () =>
      apiClientFetch<PlanPoolAlertsResponse>("/admin/bolsa-unidades/plan-alerts"),
    staleTime: 30_000,
  });
}

export function usePerfectCorpUnits() {
  return useQuery({
    queryKey: ["admin", "bolsa-unidades", "perfectcorp"],
    queryFn: () =>
      apiClientFetch<PerfectCorpUnitsResponse>(
        "/admin/bolsa-unidades/perfectcorp",
      ),
    staleTime: 60_000,
  });
}

export function useSkiniverUnits() {
  return useQuery({
    queryKey: ["admin", "bolsa-unidades", "skiniver"],
    queryFn: () =>
      apiClientFetch<SkiniverUnitsResponse>("/admin/bolsa-unidades/skiniver"),
    staleTime: 60_000,
  });
}

export function useCreateSkiniverRecharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSkiniverRechargeInput) =>
      apiClientFetch("/admin/bolsa-unidades/skiniver/recharge", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "bolsa-unidades", "skiniver"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "bolsa-unidades", "plan-alerts"],
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      await queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}
