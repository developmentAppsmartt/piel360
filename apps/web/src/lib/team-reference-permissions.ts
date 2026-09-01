"use client";

import type { TeamMemberPermission } from "@piel360/shared";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  ListChecks,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

export type TeamPermissionItem = {
  key: string;
  label: string;
  description?: string;
};

export type TeamPermissionGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  module?: TeamMemberPermission;
  items: TeamPermissionItem[];
};

/**
 * Permisos de módulo del equipo (por miembro invitado).
 * Los análisis IA (Skiniver / YouCam / Fitzpatrick) se definen en Admin → Permisos de planes.
 */
export const TEAM_PERMISSION_GROUPS: TeamPermissionGroup[] = [
  {
    key: "patients",
    label: "Pacientes",
    icon: Users,
    module: "patients",
    items: [
      { key: "patients.view", label: "Ver pacientes" },
      { key: "patients.create", label: "Crear pacientes" },
      { key: "patients.update", label: "Editar pacientes" },
      { key: "patients.delete", label: "Eliminar pacientes" },
      { key: "patients.export", label: "Exportar pacientes" },
    ],
  },
  {
    key: "analyses",
    label: "Análisis y resultados",
    icon: ClipboardList,
    module: "analyses",
    items: [
      { key: "analyses.view", label: "Ver análisis" },
      { key: "analyses.create", label: "Crear análisis" },
    ],
  },
  {
    key: "products",
    label: "Productos",
    icon: ShoppingBag,
    module: "products",
    items: [
      { key: "products.view", label: "Ver productos" },
      { key: "products.create", label: "Crear productos" },
      { key: "products.update", label: "Editar productos" },
      { key: "products.delete", label: "Eliminar productos" },
    ],
  },
  {
    key: "routines",
    label: "Rutinas",
    icon: ListChecks,
    module: "routines",
    items: [
      { key: "routines.view", label: "Ver rutinas" },
      { key: "routines.create", label: "Crear rutinas" },
      { key: "routines.update", label: "Editar rutinas" },
      { key: "routines.delete", label: "Eliminar rutinas" },
    ],
  },
  {
    key: "treatments",
    label: "Planes de tratamiento",
    icon: ClipboardList,
    module: "treatments",
    items: [
      { key: "treatments.view", label: "Ver planes" },
      { key: "treatments.create", label: "Crear planes" },
      { key: "treatments.update", label: "Editar planes" },
      { key: "treatments.delete", label: "Eliminar planes" },
      { key: "treatments.export", label: "Exportar planes" },
    ],
  },
  {
    key: "billing",
    label: "Planes y suscripción",
    icon: CreditCard,
    module: "billing",
    items: [
      { key: "billing.view", label: "Ver planes y facturación" },
      { key: "billing.consumption", label: "Ver consumo de análisis" },
    ],
  },
  {
    key: "reports",
    label: "Reportes",
    icon: FileText,
    module: "reports",
    items: [
      { key: "reports.view", label: "Ver reportes" },
      { key: "reports.export", label: "Exportar reportes" },
    ],
  },
];

export function allTeamReferencePermissionKeys() {
  return TEAM_PERMISSION_GROUPS.flatMap((group) =>
    group.items.map((item) => item.key),
  );
}

export function teamPermissionsToReferenceKeys(
  permissions: TeamMemberPermission[],
): Set<string> {
  const selected = new Set<string>();
  for (const group of TEAM_PERMISSION_GROUPS) {
    if (group.module && permissions.includes(group.module)) {
      for (const item of group.items) {
        selected.add(item.key);
      }
    }
  }
  return selected;
}

export function referenceKeysToTeamPermissions(
  keys: Set<string>,
): TeamMemberPermission[] {
  const modules = new Set<TeamMemberPermission>();
  for (const group of TEAM_PERMISSION_GROUPS) {
    if (!group.module) continue;
    const anyChecked = group.items.some((item) => keys.has(item.key));
    if (anyChecked) modules.add(group.module);
  }
  return [...modules];
}
