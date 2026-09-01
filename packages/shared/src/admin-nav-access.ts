/**
 * Permisos de acción API que abren un módulo admin además del slug `admin.*`.
 */
export const ADMIN_MODULE_LEGACY_ACTIONS: Record<string, readonly string[]> = {
  "admin.dashboard": ["view_any_user", "view_any_doctor", "view_any_patient"],
  "admin.users": ["view_any_user", "view_user", "update_user"],
  "admin.doctors": [
    "view_any_doctor",
    "view_doctor",
    "update_doctor",
    "validate_doctor",
  ],
  "admin.patients": [
    "view_any_patient",
    "view_patient",
    "create_patient",
    "update_patient",
  ],
  "admin.plans": ["view_any_plan", "view_plan", "create_plan", "update_plan"],
  "admin.subscriptions": [
    "view_any_subscription",
    "view_subscription",
    "create_subscription",
    "update_subscription",
  ],
  "admin.settings.gateways": [
    "view_any_gateway_config",
    "create_gateway_config",
    "update_gateway_config",
  ],
  "admin.settings.roles": [
    "view_any_role",
    "view_role",
    "create_role",
    "update_role",
  ],
  "admin.settings.professionals": ["view_any_role", "create_role", "update_role"],
  "admin.settings.specialties": ["view_any_role", "create_role", "update_role"],
  "admin.settings.labor_technician": ["view_any_role", "create_role", "update_role"],
  "admin.analysis_consumption": [
    "view_any_analysis_consumption",
    "view_analysis_consumption",
  ],
  "admin.verification.pending": ["validate_doctor", "view_any_doctor"],
  "admin.verification.verified": ["validate_doctor", "view_any_doctor"],
  "admin.verification.rejected": ["validate_doctor", "view_any_doctor"],
  "admin.companies": [
    "view_organization",
    "create_organization",
    "update_organization",
  ],
  "admin.settings.teams": [
    "view_organization",
    "create_organization",
    "update_organization",
  ],
  "admin.settings.global": ["manage_app_config"],
  "admin.moderators": ["view_any_user"],
  "admin.maps": ["view_any_doctor", "view_any_patient"],
  "admin.maps.doctors": ["view_any_doctor", "view_doctor"],
  "admin.maps.patients": ["view_any_patient", "view_patient"],
  "admin.purchases": ["view_any_subscription", "view_subscription"],
  "admin.billing": ["view_any_subscription", "view_subscription"],
  "admin.reports": ["view_any_analysis", "view_analysis"],
  "admin.unit_wallet": [],
  "admin.audit": [],
  "admin.notifications": [],
  "admin.help": [],
  "admin.settings": ["view_organization", "manage_app_config"],
  "admin.settings.referrals": ["view_organization"],
};

export function adminModulePermissions(slug: string): readonly string[] {
  const legacy = ADMIN_MODULE_LEGACY_ACTIONS[slug] ?? [];
  return [slug, ...legacy];
}
