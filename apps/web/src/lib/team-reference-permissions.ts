"use client";

import type { TeamMemberPermission } from "@piel360/shared";
import {
  ClipboardList,
  CreditCard,
  FileText,
  ListChecks,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

export type TeamPermissionGroup = {
  key: TeamMemberPermission;
  label: string;
  icon: LucideIcon;
  description?: string;
};

/**
 * Módulos del equipo (un permiso = un módulo).
 * Análisis IA se definen en Admin → Permisos de planes.
 */
export const TEAM_PERMISSION_GROUPS: TeamPermissionGroup[] = [
  {
    key: "patients",
    label: "Pacientes",
    icon: Users,
    description: "Ver, crear, editar y exportar pacientes",
  },
  {
    key: "analyses",
    label: "Análisis y resultados",
    icon: ClipboardList,
    description: "Ver y crear análisis",
  },
  {
    key: "products",
    label: "Productos",
    icon: ShoppingBag,
    description: "Catálogo de productos",
  },
  {
    key: "routines",
    label: "Rutinas",
    icon: ListChecks,
    description: "Rutinas de cuidado y reglas por edad de piel del equipo",
  },
  {
    key: "treatments",
    label: "Planes de tratamiento",
    icon: ClipboardList,
    description: "Planes, tratamientos y reglas por edad de piel del equipo",
  },
  {
    key: "billing",
    label: "Planes y suscripción",
    icon: CreditCard,
    description: "Facturación y consumo de análisis",
  },
  {
    key: "reports",
    label: "Reportes",
    icon: FileText,
    description: "Ver y exportar reportes",
  },
];

export function allTeamModuleKeys(): TeamMemberPermission[] {
  return TEAM_PERMISSION_GROUPS.map((group) => group.key);
}
