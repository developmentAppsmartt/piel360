"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountBranding, BrandingColors } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";

export type BrandingImageKind = "login-background" | "login-logo";

const KEY = ["doctor-branding"] as const;

export function useMyBranding() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClientFetch<AccountBranding>("/doctor/branding"),
  });
}

export function useUpdateBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { colors?: BrandingColors; loginOverlay?: boolean }) =>
      apiClientFetch<AccountBranding>("/doctor/branding", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}

export function useUploadBrandingImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, file }: { kind: BrandingImageKind; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return apiClientFetch<AccountBranding>(`/doctor/branding/${kind}`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}

export function useRemoveBrandingImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kind: BrandingImageKind) =>
      apiClientFetch<AccountBranding>(`/doctor/branding/${kind}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}
