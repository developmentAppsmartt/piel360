import {
  ScanFace,
  Sparkles,
  Stethoscope,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type {
  GoalStatus,
  PlanSaleType,
  PurchaseStatus,
} from "@/lib/queries/admin-billing";

/** Un color por tipo de análisis: píldoras de la tabla, tarjetas y metas. */
export const PLAN_TYPE_META: Record<
  PlanSaleType,
  {
    label: string;
    short: string;
    plural: string;
    goalTitle: string;
    pill: string;
    icon: LucideIcon;
    iconBox: string;
    accent: string;
    gauge: string;
  }
> = {
  aesthetic: {
    label: "Análisis estético",
    short: "Estético",
    plural: "Planes estéticos",
    goalTitle: "Planes de análisis estético",
    pill: "bg-blue-500 text-white",
    icon: Sparkles,
    iconBox: "bg-blue-50 text-blue-600",
    accent: "text-blue-600",
    gauge: "stroke-blue-500",
  },
  derm: {
    label: "Análisis dermatológico",
    short: "Dermatológico",
    plural: "Planes dermatológicos",
    goalTitle: "Planes de análisis dermatológico",
    pill: "bg-violet-400 text-white",
    icon: Stethoscope,
    iconBox: "bg-violet-50 text-violet-600",
    accent: "text-violet-600",
    gauge: "stroke-teal-500",
  },
  fototipo: {
    label: "Análisis fototipo",
    short: "Fototipo",
    plural: "Planes fototipo",
    goalTitle: "Planes de fototipo",
    pill: "bg-teal-500 text-white",
    icon: Sun,
    iconBox: "bg-teal-50 text-teal-600",
    accent: "text-teal-600",
    gauge: "stroke-teal-500",
  },
  mixed: {
    label: "Análisis mixto",
    short: "Mixto",
    plural: "Planes mixtos",
    goalTitle: "Planes mixtos",
    pill: "bg-zinc-400 text-white",
    icon: ScanFace,
    iconBox: "bg-zinc-100 text-zinc-600",
    accent: "text-zinc-600",
    gauge: "stroke-zinc-400",
  },
};

/** Estado de la compra según la pasarela. */
export const PURCHASE_STATUS_META: Record<
  PurchaseStatus,
  { label: string; pill: string }
> = {
  completed: {
    label: "Completado",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  pending: {
    label: "Pendiente",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  rejected: { label: "Rechazado", pill: "bg-red-50 text-red-700 ring-red-200" },
  manual: { label: "Manual", pill: "bg-zinc-100 text-zinc-600 ring-zinc-200" },
};

export const GOAL_STATUS_META: Record<
  GoalStatus,
  { label: string; pill: string }
> = {
  met: {
    label: "Meta cumplida",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  on_track: {
    label: "En camino",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  near: {
    label: "Cerca de la meta",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  behind: {
    label: "Por cumplir",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  none: { label: "Sin meta", pill: "bg-zinc-100 text-zinc-600 ring-zinc-200" },
};

export const SALE_TYPE_TABS = [
  { id: "all", label: "Todas" },
  { id: "common", label: "Comunes" },
  { id: "referred", label: "Referidas" },
] as const;

export type SaleTypeTab = (typeof SALE_TYPE_TABS)[number]["id"];
