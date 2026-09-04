import type { Permission } from "@/lib/queries/roles";
import { adminNav } from "@/app/admin/(panel)/nav-config";
import { doctorNav } from "@/app/doctor/(panel)/nav-config";
import { filterNavByFeatures, type NavItem } from "@/components/layout/nav-items";
import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import { DOCTOR_PANEL_ACCESS } from "@/lib/doctor-panel-permissions";
import {
  isPrimaryPanel,
  providerSlugFromUsagePermission,
  resolveUserPrimaryPanel,
  type AnalysisProviderSlug,
  type PrimaryPanel,
} from "@piel360/shared";

export type { PrimaryPanel as RolePanelContext };

export function rolePanelContext(
  roleName: string,
  primaryPanel?: string | null,
  permissions?: Pick<Permission, "kind" | "panel" | "slug" | "isActive">[],
): PrimaryPanel {
  if (isPrimaryPanel(primaryPanel)) return primaryPanel;
  const slugs =
    permissions
      ?.filter((permission) => permission.isActive !== false)
      .map((permission) => permission.slug) ?? [];
  return resolveUserPrimaryPanel(
    [{ name: roleName, isActive: true, primaryPanel: null }],
    slugs,
  );
}

export type PermissionScope = "admin_menu" | "clinical_menu" | "api_only";

const CLINICAL_ACTION_SLUGS = new Set<string>(
  Object.values(DOCTOR_PANEL_ACCESS).flatMap((permissions) => [...permissions]),
);

export function permissionScope(permission: Pick<Permission, "kind" | "panel" | "slug">): PermissionScope {
  if (permission.kind === "component" && permission.panel === "admin") {
    return "admin_menu";
  }
  if (permission.kind === "component" && permission.panel === "clinical") {
    return "clinical_menu";
  }
  if (permission.kind === "component" && permission.panel === "doctor") {
    return "clinical_menu";
  }
  if (CLINICAL_ACTION_SLUGS.has(permission.slug)) {
    return "clinical_menu";
  }
  return "api_only";
}

export type PermissionScopeCounts = {
  total: number;
  adminMenu: number;
  clinicalMenu: number;
  apiOnly: number;
};

export function countPermissionsByScope(
  permissions: Pick<Permission, "kind" | "panel" | "slug" | "isActive">[],
): PermissionScopeCounts {
  const active = permissions.filter((permission) => permission.isActive !== false);
  const counts: PermissionScopeCounts = {
    total: active.length,
    adminMenu: 0,
    clinicalMenu: 0,
    apiOnly: 0,
  };

  for (const permission of active) {
    const scope = permissionScope(permission);
    if (scope === "admin_menu") counts.adminMenu += 1;
    else if (scope === "clinical_menu") counts.clinicalMenu += 1;
    else counts.apiOnly += 1;
  }

  return counts;
}

export type NavPreviewItem = {
  key: string;
  label: string;
};

function flattenNavItems(items: NavItem[]): NavPreviewItem[] {
  const result: NavPreviewItem[] = [];
  for (const item of items) {
    result.push({
      key: `${item.href}::${item.label}`,
      label: item.label,
    });
    if (item.children?.length) {
      result.push(...flattenNavItems(item.children));
    }
  }
  return result;
}

export function visibleAdminNavItems(permissionSlugs: string[]): NavPreviewItem[] {
  const filtered = filterNavByFeatures(adminNav, {
    role: "superadmin",
    permissions: permissionSlugs,
  });
  return flattenNavItems(filtered);
}

/** @deprecated Usar visibleAdminNavItems */
export function visibleAdminNavLabels(permissionSlugs: string[]): string[] {
  return visibleAdminNavItems(permissionSlugs).map((item) => item.label);
}

export function visibleClinicalNavItems(
  permissionSlugs: string[],
  options?: {
    empresa?: boolean;
    empresaReferida?: boolean;
    verificationStatus?: string | null;
  },
): NavPreviewItem[] {
  const filtered = filterNavByFeatures(doctorNav, {
    role: "doctor",
    permissions: permissionSlugs,
    empresa: options?.empresa ?? false,
    empresaReferida: options?.empresaReferida ?? false,
    verificationStatus: options?.verificationStatus ?? "active",
  });
  return flattenNavItems(filtered);
}

/** @deprecated Usar visibleClinicalNavItems */
export function visibleClinicalNavLabels(
  permissionSlugs: string[],
  options?: {
    empresa?: boolean;
    empresaReferida?: boolean;
    verificationStatus?: string | null;
  },
): string[] {
  return visibleClinicalNavItems(permissionSlugs, options).map((item) => item.label);
}

export type ProviderPreviewItem = {
  slug: AnalysisProviderSlug;
  label: string;
};

export function selectedAnalysisProviders(
  permissions: Pick<Permission, "name" | "slug" | "isActive">[],
): ProviderPreviewItem[] {
  const items: ProviderPreviewItem[] = [];
  for (const permission of permissions) {
    if (permission.isActive === false) continue;
    const slug =
      providerSlugFromUsagePermission(permission.name) ??
      providerSlugFromUsagePermission(permission.slug);
    if (!slug) continue;
    items.push({
      slug,
      label: ANALYSIS_PROVIDER_STATIC_LABELS[slug],
    });
  }
  return items.sort((a, b) => a.label.localeCompare(b.label));
}

export function roleVisibilitySummary(
  roleName: string,
  permissions: Pick<Permission, "kind" | "panel" | "slug" | "name" | "isActive">[],
  primaryPanel?: string | null,
): {
  panel: PrimaryPanel;
  scopeCounts: PermissionScopeCounts;
  adminNavItems: NavPreviewItem[];
  clinicalNavItems: NavPreviewItem[];
  clinicalNavItemsAsEmpresa: NavPreviewItem[];
  analysisProviders: ProviderPreviewItem[];
} {
  const active = permissions.filter((permission) => permission.isActive !== false);
  const slugs = active.map((permission) => permission.slug);
  const panel = rolePanelContext(roleName, primaryPanel, permissions);

  return {
    panel,
    scopeCounts: countPermissionsByScope(permissions),
    adminNavItems: visibleAdminNavItems(slugs),
    clinicalNavItems: visibleClinicalNavItems(slugs),
    clinicalNavItemsAsEmpresa: visibleClinicalNavItems(slugs, {
      empresa: true,
      verificationStatus: "active",
    }),
    analysisProviders: selectedAnalysisProviders(active),
  };
}
