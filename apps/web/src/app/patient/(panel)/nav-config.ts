import {
  ClipboardList,
  CreditCard,
  History,
  Home,
  LifeBuoy,
  ScanFace,
} from "lucide-react";
import type { NavItem } from "@/components/layout/nav-items";

export const patientNav: NavItem[] = [
  { label: "Inicio", href: "/patient/dashboard", icon: Home },
  { label: "Mis análisis", href: "/patient/analisis", icon: ClipboardList },
  { label: "Auto-análisis", href: "/patient/auto-analisis", icon: ScanFace },
  { label: "Planes y suscripción", href: "/patient/planes", icon: CreditCard },
  { label: "Historial", href: "/patient/historial", icon: History },
  { label: "Soporte", href: "/patient/soporte", icon: LifeBuoy },
];
