import Link from "next/link";
import {
  ClipboardList,
  Clock3,
  ListChecks,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatCard = {
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
};

export function DashboardStats({
  patientCount,
  pendingCount,
  analysesCount,
  protocolsCount,
  preview = false,
}: {
  patientCount: number;
  pendingCount: number;
  analysesCount: number;
  protocolsCount: number;
  preview?: boolean;
}) {
  const cards: StatCard[] = [
    {
      label: "Pacientes",
      value: patientCount,
      hint: "Ver pacientes",
      href: "/doctor/pacientes",
      icon: Users,
      accent: "text-primary",
      iconBg: "bg-primary/10 text-primary",
    },
    {
      label: "Pendientes de confirmar",
      value: pendingCount,
      hint: "Ver pendientes",
      href: "/doctor/analisis",
      icon: Clock3,
      accent: "text-amber-600",
      iconBg: "bg-amber-100 text-amber-600",
    },
    {
      label: "Análisis realizados",
      value: analysesCount,
      hint: "Ver análisis",
      href: "/doctor/analisis",
      icon: ClipboardList,
      accent: "text-sky-600",
      iconBg: "bg-sky-100 text-sky-600",
    },
    {
      label: "Protocolos activos",
      value: protocolsCount,
      hint: "Ver protocolos",
      href: "/doctor/rutinas",
      icon: ListChecks,
      accent: "text-emerald-600",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
  ];

  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
        preview && "pointer-events-none opacity-75",
      )}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-zinc-500">{card.label}</p>
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-lg",
                card.iconBg,
              )}
            >
              <card.icon className="size-4" />
            </span>
          </div>
          <p className={cn("mt-2 text-3xl font-semibold", card.accent)}>
            {card.value}
          </p>
          {preview ? (
            <p className="mt-2 text-xs text-sky-700">{card.hint}</p>
          ) : (
            <Link
              href={card.href}
              className="mt-2 inline-block text-xs text-sky-700 hover:underline"
            >
              {card.hint}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
