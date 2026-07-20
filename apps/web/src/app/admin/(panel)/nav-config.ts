import {
  CreditCard,
  FileBarChart2,
  Home,
  Layers,
  Plug,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import type { NavItem } from "@/components/layout/nav-items";

export const adminNav: NavItem[] = [
  { label: "Inicio", href: "/admin", icon: Home },
  { label: "Usuarios", href: "/admin/usuarios", icon: Users },
  { label: "Doctores", href: "/admin/doctores", icon: Stethoscope },
  { label: "Pacientes", href: "/admin/pacientes", icon: UserRound },
  { label: "Planes", href: "/admin/planes", icon: Layers },
  { label: "Suscripciones", href: "/admin/suscripciones", icon: CreditCard },
  { label: "Gateway configs", href: "/admin/gateway-configs", icon: Plug },
  { label: "Roles y permisos", href: "/admin/roles", icon: ShieldCheck },
  { label: "Reportes", href: "/admin/reportes", icon: FileBarChart2 },
];
