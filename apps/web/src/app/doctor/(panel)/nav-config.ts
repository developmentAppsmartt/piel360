import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  Gift,
  Home,
  LifeBuoy,
  ListChecks,
  Map,
  Receipt,
  Settings,
  ShoppingBag,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import type { NavItem } from "@/components/layout/nav-items";
import { clinicalNavPermission } from "@/lib/clinical-panel-permissions";

/** Nav del panel clínico — visibilidad por slug clinical.* en BD (`permissions`). */
export const doctorNav: NavItem[] = [
  {
    label: "Inicio",
    href: "/doctor/home",
    icon: Home,
    allowedWhilePending: true,
    permissionsAny: clinicalNavPermission("clinical.home"),
  },
  {
    label: "Mapas",
    href: "/doctor/mapas",
    icon: Map,
    permissionsAny: clinicalNavPermission("clinical.maps"),
    children: [
      {
        label: "Médicos",
        href: "/doctor/mapas/medicos",
        icon: Stethoscope,
        permissionsAny: clinicalNavPermission("clinical.maps.doctors"),
      },
      {
        label: "Pacientes",
        href: "/doctor/mapas/pacientes",
        icon: UserRound,
        permissionsAny: clinicalNavPermission("clinical.maps.patients"),
      },
    ],
  },
  {
    label: "Pacientes",
    href: "/doctor/pacientes",
    icon: UserRound,
    permissionsAny: clinicalNavPermission("clinical.patients"),
  },
  {
    label: "Análisis y resultados",
    href: "/doctor/analisis",
    icon: ClipboardList,
    permissionsAny: clinicalNavPermission("clinical.analyses"),
  },
  {
    label: "Planes y suscripciones",
    href: "/doctor/planes",
    icon: CreditCard,
    allowedWhilePending: true,
    permissionsAny: clinicalNavPermission("clinical.plans"),
  },
  {
    label: "Consumo de análisis",
    href: "/doctor/consumo",
    icon: BarChart3,
    permissionsAny: clinicalNavPermission("clinical.consumption"),
  },
  {
    label: "Compras y facturación",
    href: "/doctor/facturacion",
    icon: Receipt,
    allowedWhilePending: true,
    permissionsAny: clinicalNavPermission("clinical.billing"),
  },
  {
    label: "Reportes",
    href: "/doctor/reportes",
    icon: FileBarChart2,
    permissionsAny: clinicalNavPermission("clinical.reports"),
  },
  {
    label: "Productos",
    href: "/doctor/productos",
    icon: ShoppingBag,
    permissionsAny: clinicalNavPermission("clinical.products"),
  },
  {
    label: "Rutinas y tratamientos",
    href: "/doctor/rutinas",
    icon: ListChecks,
    permissionsAny: clinicalNavPermission("clinical.routines"),
  },
  {
    label: "Configuración",
    href: "/doctor/configuracion",
    icon: Settings,
    allowedWhilePending: true,
    permissionsAny: clinicalNavPermission("clinical.settings"),
    children: [
      {
        label: "Cuenta",
        href: "/doctor/configuracion",
        icon: Settings,
        allowedWhilePending: true,
        permissionsAny: clinicalNavPermission("clinical.settings.account"),
      },
      {
        label: "Equipo",
        href: "/doctor/configuracion/equipos",
        icon: Users,
        requiresEmpresa: true,
        permissionsAny: clinicalNavPermission("clinical.settings.team"),
      },
      {
        label: "Referidos",
        href: "/doctor/configuracion/referidos",
        icon: Gift,
        requiresEmpresaReferida: true,
        permissionsAny: clinicalNavPermission("clinical.settings.referrals"),
      },
    ],
  },
  {
    label: "Soporte",
    href: "/doctor/soporte",
    icon: LifeBuoy,
    permissionsAny: clinicalNavPermission("clinical.support"),
  },
];
