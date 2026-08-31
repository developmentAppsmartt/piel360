import type { TeamMemberPermission } from "@piel360/shared";
import {
  ClipboardList,
  FileText,
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
 * Permisos de módulo del equipo (por miembro).
 * Los análisis IA (Skiniver / YouCam / Fitzpatrick) no van aquí:
 * se definen en Admin → Permisos de planes según especialidad o técnico laboral.
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
