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
      },
      {
        label: "Pacientes",
        href: "/doctor/mapas/pacientes",
        icon: UserRound,
      },
    ],
  },
  { label: "Pacientes", href: "/doctor/pacientes", icon: UserRound },
  {
    label: "Análisis y resultados",
    href: "/doctor/analisis",
    icon: ClipboardList,
  },
  {
    label: "Planes y suscripciones",
    href: "/doctor/planes",
    icon: CreditCard,
    allowedWhilePending: true,
  },
  { label: "Consumo de análisis", href: "/doctor/consumo", icon: BarChart3 },
  {
    label: "Compras y facturación",
    href: "/doctor/facturacion",
    icon: Receipt,
    allowedWhilePending: true,
  },
  { label: "Reportes", href: "/doctor/reportes", icon: FileBarChart2 },
  { label: "Productos", href: "/doctor/productos", icon: ShoppingBag },
  {
    label: "Rutinas y tratamientos",
    href: "/doctor/rutinas",
    icon: ListChecks,
  },
  {
    label: "Configuración",
    href: "/doctor/configuracion",
    icon: Settings,
    allowedWhilePending: true,
    children: [
      {
        label: "Perfil de médico",
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
