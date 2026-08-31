"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type CompanyRegistrationAdmin = {
  doctorId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  membershipType: "empresa" | "empresa_aliada";
  verificationStatus: string;
  city: string | null;
  department: string | null;
  registeredAt: string;
  organization: {
    id: string;
    name: string;
    type: string;
    status: string;
    seatUsed: number;
    seatLimit: number;
    seatPlan: string;
    referralCode: string | null;
    businessEmail: string | null;
    businessPhone: string | null;
    city: string | null;
  } | null;
};

export function useAdminCompanies() {
  return useQuery({
    queryKey: ["admin", "empresas"],
    queryFn: () => apiClientFetch<CompanyRegistrationAdmin[]>("/admin/empresas"),
  });
}
