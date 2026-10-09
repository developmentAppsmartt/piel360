"use client";

import { isClinicalPanelRole, type Role } from "@piel360/shared";
import {
  resolveRoleDisplayLabel,
  resolveRoleScopeLabel,
} from "@/lib/user-role-display";
import { useMyDoctorProfile } from "@/lib/queries/doctors";

export function useUserRoleDisplay(
  role: Role,
  options?: {
    empresa?: boolean;
    empresaReferida?: boolean;
    verificationStatus?: string | null;
  },
) {
  const enrich = isClinicalPanelRole(role);
  const profile = useMyDoctorProfile(enrich);
  const doctor = enrich ? profile.data : undefined;

  const label = resolveRoleDisplayLabel(role, {
    specialty: doctor?.specialty,
    empresa: options?.empresa,
  });

  const scope = resolveRoleScopeLabel(role, {
    empresa: options?.empresa,
    empresaReferida: options?.empresaReferida,
    verificationStatus: options?.verificationStatus,
  });

  return {
    label,
    scope,
    specialty: doctor?.specialty ?? null,
    loading: enrich && profile.isLoading,
  };
}
