import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  Layers,
  LayoutDashboard,
  Settings,
  Shield,
  Stethoscope,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/queries/roles";
import { permissionScope, type PermissionScope } from "@/lib/role-permission-scope";

const ACTION_ORDER = [
  "view_any",
  "view",
  "create",
  "update",
  "delete",
  "delete_any",
  "validate",
  "use",
] as const;

const ACTION_LABELS: Record<string, string> = {
  view_any: "Ver listado",
  view: "Ver detalle",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  delete_any: "Eliminar masivo",
  validate: "Validar",
  use: "Usar",
};

const RESOURCE_META: Record<string, { label: string; icon: LucideIcon; order: number }> = {
  user: { label: "Usuarios", icon: Users, order: 10 },
  doctor: { label: "Doctores", icon: Stethoscope, order: 20 },
  patient: { label: "Pacientes", icon: UserRound, order: 30 },
  analysis: { label: "Análisis", icon: ClipboardList, order: 40 },
  analysis_consumption: { label: "Consumo de análisis", icon: BarChart3, order: 45 },
  plan: { label: "Planes", icon: Layers, order: 50 },
  subscription: { label: "Suscripciones", icon: CreditCard, order: 60 },
  gateway_config: { label: "Pasarela de pagos", icon: CreditCard, order: 70 },
  role: { label: "Roles y permisos", icon: Shield, order: 80 },
  encyclopedia_entry: { label: "Enciclopedia", icon: BookOpen, order: 90 },
  organization: { label: "Organizaciones", icon: Building2, order: 100 },
  analysis_provider: { label: "Análisis IA (proveedor)", icon: ClipboardList, order: 110 },
  app_config: { label: "Configuración global", icon: Settings, order: 120 },
  other: { label: "Otros", icon: FileText, order: 999 },
};

const COMPONENT_PANEL_META: Record<string, { label: string; icon: LucideIcon; order: number }> = {
  admin: { label: "Módulos del panel admin", icon: LayoutDashboard, order: 5 },
  clinical: { label: "Módulos del panel clínico", icon: Stethoscope, order: 6 },
  doctor: { label: "Módulos del panel clínico", icon: Stethoscope, order: 6 },
};

/** Solo permisos asignables (activos en catálogo). */
export function assignablePermissions(permissions: Permission[]): Permission[] {
  return permissions.filter((permission) => permission.isActive !== false);
}

export type PermissionGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  section?: string;
  scope: PermissionScope;
  permissions: {
    id: string;
    name: string;
    label: string;
    slug?: string;
    isActive?: boolean;
  }[];
};

export function parsePermissionName(name: string): { action: string; resource: string } | null {
  if (name === "validate_doctor") {
    return { action: "validate", resource: "doctor" };
  }
  if (name.startsWith("use_provider_")) {
    return { action: "use", resource: "analysis_provider" };
  }
  if (name === "manage_app_config") {
    return { action: "update", resource: "app_config" };
  }

  const actions = ["view_any", "delete_any", "view", "create", "update", "delete"] as const;
  for (const action of actions) {
    const prefix = `${action}_`;
    if (name.startsWith(prefix)) {
      return { action, resource: name.slice(prefix.length) };
    }
  }
  return null;
}

function permissionActionLabel(action: string, resource: string, name: string): string {
  if (name.startsWith("use_provider_")) {
    const slug = name.replace("use_provider_", "");
    const labels: Record<string, string> = {
      skiniver: "Dermatológico (Skiniver)",
      youcam: "Estético (YouCam)",
      fitzpatrick: "Fototipo (Fitzpatrick)",
    };
    return labels[slug] ?? slug;
  }
  return ACTION_LABELS[action] ?? action;
}

function groupActionPermissions(permissions: Permission[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();

  for (const permission of permissions) {
    const parsed = parsePermissionName(permission.name);
    const resource = parsed?.resource ?? "other";
    const meta = RESOURCE_META[resource] ?? RESOURCE_META.other;
    const action = parsed?.action ?? "other";

    if (!groups.has(resource)) {
      groups.set(resource, {
        key: resource,
        label: meta.label,
        icon: meta.icon,
        scope: "api_only",
        permissions: [],
      });
    }

    const group = groups.get(resource)!;
    const scope = permissionScope(permission);
    if (scope === "clinical_menu") group.scope = "clinical_menu";

    groups.get(resource)!.permissions.push({
      id: permission.id,
      name: permission.name,
      slug: permission.slug,
      isActive: permission.isActive,
      label: permissionActionLabel(action, resource, permission.name),
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      permissions: [...group.permissions].sort((a, b) => {
        const pa = parsePermissionName(a.name);
        const pb = parsePermissionName(b.name);
        const ai = ACTION_ORDER.indexOf((pa?.action ?? "other") as (typeof ACTION_ORDER)[number]);
        const bi = ACTION_ORDER.indexOf((pb?.action ?? "other") as (typeof ACTION_ORDER)[number]);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name);
      }),
    }))
    .sort(
      (a, b) =>
        (RESOURCE_META[a.key]?.order ?? RESOURCE_META.other.order) -
        (RESOURCE_META[b.key]?.order ?? RESOURCE_META.other.order),
    );
}

/** Un grupo por módulo de menú (cada componente admin = una tarjeta con un checkbox). */
function groupComponentPermissions(permissions: Permission[]): PermissionGroup[] {
  return [...permissions]
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        (a.label ?? a.slug).localeCompare(b.label ?? b.slug),
    )
    .map((permission) => {
      const panel = permission.panel ?? "admin";
      const meta = COMPONENT_PANEL_META[panel] ?? {
        label: `Módulo (${panel})`,
        icon: LayoutDashboard,
        order: 50,
      };
      const moduleLabel = permission.label ?? permission.slug;
      return {
        key: `component_${permission.slug}`,
        label: moduleLabel,
        icon: meta.icon,
        order: permission.sortOrder ?? meta.order,
        section: meta.label,
        scope:
          permission.panel === "admin"
            ? ("admin_menu" as const)
            : ("clinical_menu" as const),
        permissions: [
          {
            id: permission.id,
            name: permission.name,
            slug: permission.slug,
            isActive: permission.isActive,
            label: permission.href
              ? `Acceso al menú · ${permission.href}`
              : "Acceso al menú",
          },
        ],
      };
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(({ order: _order, ...group }) => group);
}

export type PermissionGroupSection = {
  title: string;
  groups: PermissionGroup[];
};

export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  return groupPermissionsBySection(permissions).flatMap((section) => section.groups);
}

/** Agrupa permisos en secciones: módulos de menú (uno por tarjeta) + acciones API por recurso. */
export function groupPermissionsBySection(
  permissions: Permission[],
): PermissionGroupSection[] {
  const active = assignablePermissions(permissions);
  const components = active.filter((permission) => permission.kind === "component");
  const actions = active.filter((permission) => permission.kind !== "component");

  const sections: PermissionGroupSection[] = [];

  const adminComponents = components.filter(
    (permission) => permission.panel === "admin",
  );
  const clinicalComponents = components.filter(
    (permission) => permission.panel === "clinical" || permission.panel === "doctor",
  );

  const adminGroups = groupComponentPermissions(adminComponents);
  if (adminGroups.length > 0) {
    sections.push({
      title: "Módulos del panel admin",
      groups: adminGroups,
    });
  }

  const clinicalGroups = groupComponentPermissions(clinicalComponents);
  if (clinicalGroups.length > 0) {
    sections.push({
      title: "Módulos del panel clínico",
      groups: clinicalGroups,
    });
  }

  const actionGroups = groupActionPermissions(actions);
  if (actionGroups.length > 0) {
    sections.push({
      title: "Permisos de acción (API)",
      groups: actionGroups,
    });
  }

  return sections;
}

/** IDs de todos los componentes clínicos activos. */
export function clinicalComponentPermissionIds(permissions: Permission[]): string[] {
  return assignablePermissions(permissions)
    .filter(
      (permission) =>
        permission.kind === "component" &&
        (permission.panel === "clinical" || permission.panel === "doctor"),
    )
    .map((permission) => permission.id);
}

/** IDs de todos los componentes admin activos (referencia superadmin). */
export function adminComponentPermissionIds(permissions: Permission[]): string[] {
  return assignablePermissions(permissions)
    .filter((permission) => permission.kind === "component" && permission.panel === "admin")
    .map((permission) => permission.id);
}

export function allPermissionIds(permissions: Permission[]): string[] {
  return assignablePermissions(permissions).map((permission) => permission.id);
}

export function planModuleLabelsFromPermissionNames(names: string[]): string[] {
  const unique = new Set(names);
  return groupPermissions(names.map((name, index) => ({
    id: String(index),
    name,
    slug: name,
    isActive: true,
    kind: "action",
  })))
    .filter((group) => group.permissions.some((permission) => unique.has(permission.name)))
    .map((group) => group.label);
}
