"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type BolsaPlanCupo = {
  id: string;
  planName: string;
  holderName: string;
  holderEmail: string | null;
  analyses: number;
  credits: number;
  used: number;
  remaining: number;
  assignedAt: string;
};

export type AnalisisPiel360UnitPool = {
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

export type AnalisisPiel360FeatureCostRow = {
  description: string;
  amount: number;
  runTaskUrl: string;
};

export type AnalisisPiel360UnitsResponse = {
  source: "analisispiel360";
  fetchedAt: string;
  pool: AnalisisPiel360UnitPool;
  balances: Array<{
    id: string;
    type: string;
    amount: number;
    expiry: string | null;
  }>;
  featureCosts: {
    skinAnalysis: AnalisisPiel360FeatureCostRow[];
    fitzpatrick: AnalisisPiel360FeatureCostRow[];
    estimatedPerAnalysis: {
      hdUnits: number;
      concerns: number;
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
    note?: string | null;
  }>;
  planCupos: BolsaPlanCupo[];
};

export type AnalisisDermaPiel360UnitPool = {
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

export type AnalisisDermaPiel360UnitsResponse = {
  source: "analisisdermapiel360";
  fetchedAt: string;
  providerConfigured: boolean;
  pool: AnalisisDermaPiel360UnitPool;
  history: Array<{
    id: string;
    kind?: string;
    quantity: number;
    expiresAt: string | null;
    note: string | null;
    createdAt: string;
    addedBy: string;
    addedByEmail: string | null;
  }>;
  planCupos: BolsaPlanCupo[];
};

export type CreateAnalisisDermaPiel360RechargeInput = {
  quantity: number;
  expiresAt?: string;
  note?: string;
};

export type PlanPoolAlertPlan = {
  id: string;
  name: string;
  analysisLimit: number;
  poolProvider: "analisisdermapiel360" | "analisispiel360";
  poolAvailable: number;
  poolRequired: number;
  poolUnavailableReason: string | null;
  provider: { id: string; name: string; slug: string };
};

export type PlanPoolAlertsResponse = {
  fetchedAt: string;
  balances: { analisisdermapiel360: number; analisispiel360: number };
  hasAlerts: boolean;
  unavailablePlans: PlanPoolAlertPlan[];
};

export type PrebolsaStage = "pendingPayment" | "awaitingCredits" | "ready";

export type PrebolsaItem = {
  id: string;
  stage: PrebolsaStage;
  createdAt: string;
  user: { id: string; name: string; email: string };
  plan: { id: string; name: string; analysisLimit: number };
  poolProvider: "analisisdermapiel360" | "analisispiel360";
  poolLabel: string;
  poolAvailable: number;
  poolRequired: number;
};

export type PrebolsaResponse = {
  fetchedAt: string;
  balances: { analisisdermapiel360: number; analisispiel360: number };
  counts: {
    pendingPayment: number;
    awaitingCredits: number;
    ready: number;
  };
  items: PrebolsaItem[];
};

export function usePrebolsa() {
  return useQuery({
    queryKey: ["admin", "bolsa-unidades", "prebolsa"],
    queryFn: () =>
      apiClientFetch<PrebolsaResponse>("/admin/bolsa-unidades/prebolsa"),
    staleTime: 15_000,
  });
}

function usePrebolsaMutation<T>(
  mutationFn: (id: string) => Promise<T>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "bolsa-unidades"],
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      await queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

export function useActivatePrebolsa() {
  return usePrebolsaMutation((id) =>
    apiClientFetch(`/admin/bolsa-unidades/prebolsa/${id}/activate`, {
      method: "POST",
    }),
  );
}

export function useDiscardPrebolsa() {
  return usePrebolsaMutation((id) =>
    apiClientFetch(`/admin/bolsa-unidades/prebolsa/${id}`, {
      method: "DELETE",
    }),
  );
}

export function usePlanPoolAlerts() {
  return useQuery({
    queryKey: ["admin", "bolsa-unidades", "plan-alerts"],
    queryFn: () =>
      apiClientFetch<PlanPoolAlertsResponse>("/admin/bolsa-unidades/plan-alerts"),
    staleTime: 30_000,
  });
}

export function useAnalisisPiel360Units() {
  return useQuery({
    queryKey: ["admin", "bolsa-unidades", "analisispiel360"],
    queryFn: () =>
      apiClientFetch<AnalisisPiel360UnitsResponse>(
        "/admin/bolsa-unidades/analisispiel360",
      ),
    staleTime: 60_000,
  });
}

export function useAnalisisDermaPiel360Units() {
  return useQuery({
    queryKey: ["admin", "bolsa-unidades", "analisisdermapiel360"],
    queryFn: () =>
      apiClientFetch<AnalisisDermaPiel360UnitsResponse>("/admin/bolsa-unidades/analisisdermapiel360"),
    staleTime: 60_000,
  });
}

export function useCreateAnalisisDermaPiel360Recharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnalisisDermaPiel360RechargeInput) =>
      apiClientFetch("/admin/bolsa-unidades/analisisdermapiel360/recharge", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "bolsa-unidades", "analisisdermapiel360"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "bolsa-unidades", "plan-alerts"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "bolsa-unidades", "prebolsa"],
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      await queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}
