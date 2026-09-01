"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type OrgCompanyProfile = {
  id: string;
  type: string;
  name: string;
  seatPlan: string;
  seatLimit: number;
  seatUsed: number;
  referralCode: string | null;
  status: string;
  memberRole: string;
  ciiuCode: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  country: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  businessEmail: string | null;
  businessPhone: string | null;
  website: string | null;
  employeeCountRange: string | null;
  legalRepName: string | null;
  legalRepDocType: string | null;
  legalRepDocNumber: string | null;
  legalRepCedulaDocKey: string | null;
  rutDocKey: string | null;
  existenceCertDocKey: string | null;
  legalRepCedulaDocUrl?: string | null;
  rutDocUrl?: string | null;
  existenceCertDocUrl?: string | null;
};

export type OrgCompanyProfileInput = {
  name?: string;
  ciiuCode?: string;
  address?: string;
  city?: string;
  department?: string;
  country?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  businessEmail?: string;
  businessPhone?: string;
  website?: string;
  employeeCountRange?: string;
  legalRepName?: string;
  legalRepDocType?: string;
  legalRepDocNumber?: string;
};

export type OrgTeamMember = {
  id: string;
  memberRole: string;
  userId: string;
  email: string;
  name: string;
  specialty: string | null;
};

export type OrgWithTeam = OrgCompanyProfile & {
  members?: OrgTeamMember[];
};

export function useOrganizationTeam(enabled = true) {
  return useQuery({
    queryKey: ["organizations", "me", "team"],
    queryFn: () => apiClientFetch<OrgWithTeam>("/organizations/me"),
    enabled,
    retry: false,
  });
}

export function useMyOrganization(enabled = true) {
  return useQuery({
    queryKey: ["organizations", "me"],
    queryFn: () => apiClientFetch<OrgCompanyProfile>("/organizations/me"),
    enabled,
    retry: false,
  });
}

export function useUpdateMyOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrgCompanyProfileInput) =>
      apiClientFetch<OrgCompanyProfile>("/organizations/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["organizations", "me"], data);
    },
  });
}

export function useUploadOrganizationDocuments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClientFetch<OrgCompanyProfile>("/organizations/me/documents", {
        method: "POST",
        body: formData,
      }),
    onSuccess: (data) => {
      qc.setQueryData(["organizations", "me"], data);
    },
  });
}
