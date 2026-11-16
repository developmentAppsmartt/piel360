"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeadIntent, LeadInterest, LeadStatus } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export type AdminLead = {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  interest: LeadInterest;
  intent: LeadIntent;
  planId: string | null;
  planName: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  status: LeadStatus;
  notes: string | null;
  createdAt: string;
};

export type AdminLeadsPage = { items: AdminLead[]; total: number; page: number; pageSize: number };

export type LeadFilters = { status: LeadStatus | "all"; q: string; page: number };

export const ADMIN_LEADS_KEY = ["admin", "leads"] as const;

export function useAdminLeads(filters: LeadFilters) {
  const params = new URLSearchParams({ page: String(filters.page) });
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  return useQuery({
    queryKey: [...ADMIN_LEADS_KEY, filters],
    queryFn: () => apiClientFetch<AdminLeadsPage>(`/admin/leads?${params}`),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: LeadStatus; notes?: string }) =>
      apiClientFetch<AdminLead>(`/admin/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_LEADS_KEY });
    },
  });
}
