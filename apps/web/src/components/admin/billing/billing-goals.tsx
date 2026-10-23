"use client";

import { useState } from "react";
import { Info, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import type {
  AdminBillingResponse,
  SalesGoalItem,
} from "@/lib/queries/admin-billing";
import { cn } from "@/lib/utils";
import { BillingGoalsDialog } from "./billing-goals-dialog";
import { GOAL_STATUS_META, PLAN_TYPE_META } from "./billing-labels";
import { SalesGoalGauge } from "./sales-goal-gauge";

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function GoalCard({ item }: { item: SalesGoalItem }) {
  const meta = PLAN_TYPE_META[item.type];
  const status = GOAL_STATUS_META[item.status];
  const Icon = meta.icon;
  return (
    <ModuleCard className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            meta.iconBox,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-foreground">
          {meta.goalTitle}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {item.target ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">planes</p>
        </div>
        <SalesGoalGauge percent={item.percent} strokeClass={meta.gauge} />
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Vendidos</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {item.sold}
          </p>
          <p className="text-xs text-muted-foreground">planes</p>
        </div>
      </div>
      <span
        className={cn(
          "mx-auto inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
          status.pill,
        )}
      >
        {status.label}
      </span>
    </ModuleCard>
  );
}

/** Metas del mes del «hasta» del filtro. El estado sigue el ritmo del mes. */
export function BillingGoals({
  goals,
}: {
  goals: AdminBillingResponse["goals"];
}) {
  const [configuring, setConfiguring] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-base font-semibold text-foreground">
          Metas mensuales de ventas · {monthLabel(goals.month)}
        </h2>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" aria-hidden />
          Metas por tipo de plan y por mes ·{" "}
          {Math.round(goals.monthProgress * 100)}% del mes transcurrido
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setConfiguring(true)}
        >
          <Settings className="size-4" aria-hidden />
          Configurar metas
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {goals.items.map((item) => (
          <GoalCard key={item.type} item={item} />
        ))}
      </div>
      {configuring ? (
        <BillingGoalsDialog
          month={goals.month}
          items={goals.items}
          onClose={() => setConfiguring(false)}
        />
      ) : null}
    </section>
  );
}
