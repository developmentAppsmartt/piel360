"use client";

import { useQuery } from "@tanstack/react-query";
import type { Plan } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => apiClientFetch<Plan[]>("/plans"),
  });
}
