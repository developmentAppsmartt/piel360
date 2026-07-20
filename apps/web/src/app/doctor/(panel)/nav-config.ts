import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  Home,
  LifeBuoy,
  Receipt,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import type { NavItem } from "@/components/layout/nav-items";

export const doctorNav: NavItem[] = [
  { label: "Inicio", href: "/doctor/home", icon: Home },
  { label: "Equipo", href: "/doctor/equipo", icon: Users },
  { label: "Pacientes", href: "/doctor/pacientes", icon: UserRound },
  { label: "Análisis y resultados", href: "/doctor/analisis", icon: ClipboardList },
  { label: "Planes y suscripciones", href: "/doctor/planes", icon: CreditCard },
  { label: "Consumo de análisis", href: "/doctor/consumo", icon: BarChart3 },
  { label: "Compras y facturación", href: "/doctor/facturacion", icon: Receipt },
  { label: "Reportes", href: "/doctor/reportes", icon: FileBarChart2 },
  { label: "Configuración", href: "/doctor/configuracion", icon: Settings },
  { label: "Soporte", href: "/doctor/soporte", icon: LifeBuoy },
];
