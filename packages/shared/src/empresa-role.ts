/** Permisos RBAC por defecto del rol `empresa` (cuenta empresarial). */
export const EMPRESA_ROLE_PERMISSIONS = [
  "view_any_patient",
  "view_patient",
  "create_patient",
  "update_patient",
  "view_any_analysis",
  "view_analysis",
  "create_analysis",
  "view_any_plan",
  "view_plan",
  "view_any_subscription",
  "view_subscription",
  "view_any_analysis_consumption",
  "view_analysis_consumption",
  "view_any_doctor",
  "view_doctor",
  "view_organization",
  "create_organization",
  "update_organization",
  "view_any_encyclopedia_entry",
  "view_encyclopedia_entry",
] as const;

export type EmpresaRolePermission = (typeof EMPRESA_ROLE_PERMISSIONS)[number];
