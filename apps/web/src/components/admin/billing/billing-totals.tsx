import {
  CircleDollarSign,
  Clock,
  CreditCard,
  FileText,
  Handshake,
  ShoppingCart,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatCOP } from "@/components/payments/subscription-utils";
import { ModuleCard } from "@/components/ui/module-card";
import type { AdminBillingResponse } from "@/lib/queries/admin-billing";
import { cn } from "@/lib/utils";

/** Tarjeta de indicador con icono, la pieza de «Totales» y de «Compras por tipo». */
export function MetricTile({
  icon: Icon,
  iconBox,
  label,
  value,
  valueClass,
}: {
  icon: LucideIcon;
  iconBox: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <ModuleCard className="flex items-center gap-3 p-4">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          iconBox,
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-xl font-bold tabular-nums text-foreground",
            valueClass,
          )}
        >
          {value}
        </p>
      </div>
    </ModuleCard>
  );
}

export function BillingTotals({
  metrics,
}: {
  metrics: AdminBillingResponse["metrics"];
}) {
  const tiles = [
    {
      icon: CircleDollarSign,
      iconBox: "bg-primary/10 text-primary",
      label: "Ingreso bruto",
      value: formatCOP(metrics.grossTotal),
    },
    {
      icon: Wallet,
      iconBox: "bg-emerald-50 text-emerald-600",
      label: "Neto plataforma",
      value: formatCOP(metrics.platformNetTotal),
      valueClass: "text-emerald-600",
    },
    {
      icon: CreditCard,
      iconBox: "bg-primary/10 text-primary",
      label: "Fees pasarela",
      value: formatCOP(metrics.gatewayFeesTotal),
    },
    {
      icon: Handshake,
      iconBox: "bg-amber-50 text-amber-600",
      label: "Comisiones aliados",
      value: formatCOP(metrics.alliedCommissionsTotal),
      valueClass: "text-amber-600",
    },
    {
      icon: FileText,
      iconBox: "bg-primary/10 text-primary",
      label: "Facturas",
      value: String(metrics.invoiceCount),
    },
    {
      icon: ShoppingCart,
      iconBox: "bg-primary/10 text-primary",
      label: "Ventas comunes",
      value: String(metrics.commonSalesCount),
    },
    {
      icon: UsersRound,
      iconBox: "bg-sky-50 text-sky-600",
      label: "Ventas referidas",
      value: String(metrics.referredSalesCount),
      valueClass: "text-sky-600",
    },
    // Global, sin filtro de fechas: es lo que envía «Dispersar todas».
    {
      icon: Clock,
      iconBox: "bg-amber-50 text-amber-600",
      label: "Pendiente dispersar",
      value: formatCOP(metrics.alliedPendingGlobal),
      valueClass: "text-amber-600",
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">
        Totales de facturación y cobros
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <MetricTile key={tile.label} {...tile} />
        ))}
      </div>
    </section>
  );
}
