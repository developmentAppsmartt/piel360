import {
  Building2,
  CreditCard,
  FileBarChart2,
  HelpCircle,
  Home,
  Layers,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Bell,
  Users,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type { NavItem } from "@/components/layout/nav-items";

/** Nav alineada al mockup PIEL360 backoffice (rutas reales + stubs UI). */
export const adminNav: NavItem[] = [
  { label: "Inicio", href: "/admin", icon: Home },
  { label: "Empresas", href: "/admin/empresas", icon: Building2 },
  { label: "Usuarios", href: "/admin/usuarios", icon: Users },
  { label: "Bolsa de unidades", href: "/admin/bolsa-unidades", icon: Package },
  { label: "Planes", href: "/admin/planes", icon: Layers },
  { label: "Compras y transacciones", href: "/admin/compras", icon: ShoppingCart },
  { label: "Reportes", href: "/admin/reportes", icon: FileBarChart2 },
  { label: "Facturación", href: "/admin/facturacion", icon: Receipt },
  { label: "Doctores", href: "/admin/doctores", icon: Stethoscope },
  { label: "Pacientes", href: "/admin/pacientes", icon: UserRound },
  { label: "Suscripciones", href: "/admin/suscripciones", icon: CreditCard },
  { label: "Configuración", href: "/admin/roles", icon: Settings },
  { label: "Auditoría", href: "/admin/auditoria", icon: Shield },
  { label: "Notificaciones", href: "/admin/notificaciones", icon: Bell },
  { label: "Ayuda", href: "/admin/ayuda", icon: HelpCircle },
];
