import { CircleDollarSign, ShoppingCart } from "lucide-react";
import { formatCOP } from "@/components/payments/subscription-utils";
import type {
  AdminBillingResponse,
  GoalPlanType,
} from "@/lib/queries/admin-billing";
import { PLAN_TYPE_META } from "./billing-labels";
import { MetricTile } from "./billing-totals";

const CARD_TYPES: GoalPlanType[] = ["aesthetic", "derm", "fototipo"];

/** Compras completadas del periodo; Mixto no tiene tarjeta pero suma al total. */
export function BillingTypeCards({
  byType,
}: {
  byType: AdminBillingResponse["byType"];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <MetricTile
        icon={ShoppingCart}
        iconBox="bg-primary/10 text-primary"
        label="Total de compras"
        value={String(byType.purchaseCount)}
      />
      <MetricTile
        icon={CircleDollarSign}
        iconBox="bg-emerald-50 text-emerald-600"
        label="Ingresos brutos"
        value={formatCOP(byType.grossTotal)}
        valueClass="text-emerald-600"
      />
      {CARD_TYPES.map((type) => {
        const meta = PLAN_TYPE_META[type];
        return (
          <MetricTile
            key={type}
            icon={meta.icon}
            iconBox={meta.iconBox}
            label={meta.plural}
            value={String(byType.counts[type])}
            valueClass={meta.accent}
          />
        );
      })}
    </div>
  );
}
