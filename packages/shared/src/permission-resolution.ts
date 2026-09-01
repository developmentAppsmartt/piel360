import { ADMIN_COMPONENTS } from "./admin-components.js";
import { CLINICAL_COMPONENTS } from "./clinical-components.js";

const STANDARD_CRUD_ACTIONS = [
  "view_any",
  "view",
  "create",
  "update",
  "delete",
  "delete_any",
] as const;

/** Recurso RBAC → permisos de acción estándar (`view_any_user`, …). */
function crudActionsForResource(resource: string): string[] {
  return STANDARD_CRUD_ACTIONS.map((action) => `${action}_${resource}`);
}

/**
 * Módulo de menú admin → recursos API que debe poder usar quien tenga el módulo.
 * Marcar el módulo en la matriz equivale a CRUD completo sobre ese recurso.
 */
const ADMIN_COMPONENT_RESOURCES: Record<string, readonly string[]> = {
  "admin.users": ["user"],
  "admin.doctors": ["doctor"],
  "admin.patients": ["patient"],
  "admin.plans": ["plan"],
  "admin.subscriptions": ["subscription"],
  "admin.settings.gateways": ["gateway_config"],
  "admin.settings.roles": ["role"],
  "admin.settings.professionals": ["role"],
  "admin.settings.specialties": ["role"],
  "admin.settings.labor_technician": ["role"],
  "admin.analysis_consumption": ["analysis_consumption"],
  "admin.verification.pending": ["doctor"],
  "admin.verification.verified": ["doctor"],
  "admin.verification.rejected": ["doctor"],
  "admin.companies": ["organization"],
  "admin.settings.teams": ["organization"],
  "admin.moderators": ["user"],
};

/** Módulo clínico → recursos API relacionados. */
const CLINICAL_COMPONENT_RESOURCES: Record<string, readonly string[]> = {
  "clinical.patients": ["patient"],
  "clinical.analyses": ["analysis"],
  "clinical.plans": ["plan", "subscription"],
  "clinical.consumption": ["analysis_consumption"],
  "clinical.billing": ["subscription", "gateway_config"],
};

/** Acciones extra que no siguen el patrón CRUD estándar. */
const COMPONENT_EXTRA_ACTIONS: Record<string, readonly string[]> = {
  "admin.verification.pending": ["validate_doctor"],
  "admin.verification.verified": ["validate_doctor"],
  "admin.verification.rejected": ["validate_doctor"],
  "admin.doctors": ["validate_doctor"],
  "admin.settings.global": ["manage_app_config"],
};

const ALL_COMPONENT_SLUGS = new Set([
  ...ADMIN_COMPONENTS.map((component) => component.slug),
  ...CLINICAL_COMPONENTS.map((component) => component.slug),
]);

function isComponentSlug(permission: string): boolean {
  return ALL_COMPONENT_SLUGS.has(permission);
}

/** Expande slugs de módulo a permisos de acción API implícitos. */
export function expandModulePermissions(permissions: string[]): Set<string> {
  const expanded = new Set(permissions);

  for (const permission of permissions) {
    if (!isComponentSlug(permission)) continue;

    const adminResources = ADMIN_COMPONENT_RESOURCES[permission];
    const clinicalResources = CLINICAL_COMPONENT_RESOURCES[permission];

    for (const resource of adminResources ?? []) {
      for (const action of crudActionsForResource(resource)) {
        expanded.add(action);
      }
    }
    for (const resource of clinicalResources ?? []) {
      for (const action of crudActionsForResource(resource)) {
        expanded.add(action);
      }
    }

    for (const action of COMPONENT_EXTRA_ACTIONS[permission] ?? []) {
      expanded.add(action);
    }
  }

  return expanded;
}

/**
 * Comprueba si el usuario tiene un permiso (directo o implícito por módulo de menú).
 * Un checkbox de módulo en la matriz de roles concede las acciones API del recurso.
 */
export function hasEffectivePermission(
  permissions: string[] | undefined,
  required: string,
): boolean {
  if (!permissions?.length) return false;
  if (permissions.includes(required)) return true;
  return expandModulePermissions(permissions).has(required);
}
