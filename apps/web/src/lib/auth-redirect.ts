import {
  hasAdminModulePermission,
  hasClinicalModulePermission,
  homePathForPrimaryPanel,
  isClinicalPanelRole,
  isDoctorVerificationActive,
  isPrimaryPanel,
  type PrimaryPanel,
  type Role,
} from "@piel360/shared";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  primaryPanel?: PrimaryPanel;
  permissions?: string[];
  verificationStatus?: string;
  empresa?: boolean;
  empresaReferida?: boolean;
}

export function homeForUser(user: AuthUser): string {
  const permissions = user.permissions;

  if (permissions?.length) {
    const clinical = hasClinicalModulePermission(permissions);
    const admin = hasAdminModulePermission(permissions);
    if (clinical && !admin) {
      return homePathForPrimaryPanel("clinical", {
        clinicalPending:
          isClinicalPanelRole(user.role) &&
          !isDoctorVerificationActive(user.verificationStatus),
      });
    }
    if (admin && !clinical) {
      return homePathForPrimaryPanel("admin", {
        monitor: user.role === "monitor",
      });
    }
    if (clinical) {
      return homePathForPrimaryPanel("clinical", {
        clinicalPending:
          isClinicalPanelRole(user.role) &&
          !isDoctorVerificationActive(user.verificationStatus),
      });
    }
  }

  const primaryPanel: PrimaryPanel = isPrimaryPanel(user.primaryPanel)
    ? user.primaryPanel
    : user.role === "patient"
      ? "patient"
      : user.role === "superadmin" || user.role === "monitor"
        ? "admin"
        : user.role === "empresa"
          ? "clinical"
          : "clinical";

  return homePathForPrimaryPanel(primaryPanel, {
    monitor: user.role === "monitor",
    clinicalPending:
      isClinicalPanelRole(user.role) &&
      !isDoctorVerificationActive(user.verificationStatus),
  });
}
