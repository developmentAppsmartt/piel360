"use client";

import { useMutation } from "@tanstack/react-query";
import type { WompiCheckoutResponse } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export function useCreateWompiCheckout() {
  return useMutation({
    mutationFn: (planId: string) =>
      apiClientFetch<WompiCheckoutResponse>("/payments/wompi/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),
  });
}
