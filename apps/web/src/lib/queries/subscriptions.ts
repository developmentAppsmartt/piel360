"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export interface Subscription {
  id: string;
  status: "active" | "pending" | "cancelled";
  endsAt: string | null;
  wompiTransactionId: string | null;
  createdAt: string;
  remainingCredits: number;
  plan: {
    id: string;
    name: string;
    analysisLimit: number;
    durationDays: number;
    price: string;
    provider: { slug: string; name: string };
  };
}

export function useMySubscriptions() {
  return useQuery({
    queryKey: ["me", "subscriptions"],
    queryFn: () => apiClientFetch<Subscription[]>("/me/subscriptions"),
  });
}
