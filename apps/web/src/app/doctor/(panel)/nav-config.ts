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
import { DOCTOR_PANEL_ACCESS } from "@/lib/doctor-panel-permissions";

export const doctorNav: NavItem[] = [
  { label: "Inicio", href: "/doctor/home", icon: Home, allowedWhilePending: true },
  {
    label: "Mapas",
    href: "/doctor/mapas",
    icon: Map,
    children: [
      {
        label: "Médicos",
        href: "/doctor/mapas/medicos",
        icon: Stethoscope,
        permissionsAny: DOCTOR_PANEL_ACCESS.mapsDoctors,
      },
      {
        label: "Pacientes",
        href: "/doctor/mapas/pacientes",
        icon: UserRound,
        permissionsAny: DOCTOR_PANEL_ACCESS.mapsPatients,
      },
    ],
  },
  {
    label: "Pacientes",
    href: "/doctor/pacientes",
    icon: UserRound,
    permissionsAny: DOCTOR_PANEL_ACCESS.patients,
  },
  {
    label: "Análisis y resultados",
    href: "/doctor/analisis",
    icon: ClipboardList,
    permissionsAny: DOCTOR_PANEL_ACCESS.analyses,
  },
  {
    label: "Planes y suscripciones",
    href: "/doctor/planes",
    icon: CreditCard,
    allowedWhilePending: true,
    permissionsAny: DOCTOR_PANEL_ACCESS.plans,
  },
  {
    label: "Consumo de análisis",
    href: "/doctor/consumo",
    icon: BarChart3,
    permissionsAny: DOCTOR_PANEL_ACCESS.consumption,
  },
  {
    label: "Compras y facturación",
    href: "/doctor/facturacion",
    icon: Receipt,
    allowedWhilePending: true,
    permissionsAny: DOCTOR_PANEL_ACCESS.billing,
  },
  {
    label: "Reportes",
    href: "/doctor/reportes",
    icon: FileBarChart2,
    permissionsAny: DOCTOR_PANEL_ACCESS.reports,
  },
  {
    label: "Productos",
    href: "/doctor/productos",
    icon: ShoppingBag,
    permissionsAny: DOCTOR_PANEL_ACCESS.products,
  },
  {
    label: "Rutinas y tratamientos",
    href: "/doctor/rutinas",
    icon: ListChecks,
    permissionsAny: DOCTOR_PANEL_ACCESS.routines,
  },
  {
    label: "Configuración",
    href: "/doctor/configuracion",
    icon: Settings,
    allowedWhilePending: true,
    children: [
      {
        label: "Cuenta",
        href: "/doctor/configuracion",
        icon: Settings,
        allowedWhilePending: true,
      },
      {
        label: "Equipo",
        href: "/doctor/configuracion/equipos",
        icon: Users,
        requiresEmpresa: true,
      },
      {
        label: "Referidos",
        href: "/doctor/configuracion/referidos",
        icon: Gift,
        requiresEmpresaReferida: true,
      },
    ],
  },
  { label: "Soporte", href: "/doctor/soporte", icon: LifeBuoy },
];
