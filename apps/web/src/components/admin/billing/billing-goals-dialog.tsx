"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import {
  useUpdateSalesGoals,
  type GoalPlanType,
  type SalesGoalItem,
} from "@/lib/queries/admin-billing";
import { PLAN_TYPE_META } from "./billing-labels";

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-card px-3 text-sm tabular-nums focus-visible:border-primary focus-visible:outline-none";

/**
 * Metas del mes, una por tipo de plan. El formulario se monta al abrir (el
 * padre lo renderiza solo con `open`), así arranca con las metas guardadas
 * sin sincronizar estado en un efecto.
 */
export function BillingGoalsDialog({
  month,
  items,
  onClose,
}: {
  month: string;
  items: SalesGoalItem[];
  onClose: () => void;
}) {
  const save = useUpdateSalesGoals();
  const [draftMonth, setDraftMonth] = useState(month);
  const [targets, setTargets] = useState<Record<GoalPlanType, string>>(
    () =>
      Object.fromEntries(
        items.map((i) => [i.type, i.target == null ? "" : String(i.target)]),
      ) as Record<GoalPlanType, string>,
  );

  function submit() {
    const payload: { month: string } & Partial<Record<GoalPlanType, number>> = {
      month: draftMonth,
    };
    for (const item of items) {
      const raw = targets[item.type].trim();
      if (raw !== "") payload[item.type] = Math.max(0, Math.floor(Number(raw)));
    }
    save.mutate(payload, { onSuccess: onClose });
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar metas</DialogTitle>
          <DialogDescription>
            Planes que se esperan vender en el mes, por tipo de plan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Mes
            </span>
            <input
              type="month"
              value={draftMonth}
              onChange={(e) => e.target.value && setDraftMonth(e.target.value)}
              className={inputClass}
            />
          </label>
          {items.map((item) => (
            <label key={item.type} className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {PLAN_TYPE_META[item.type].goalTitle}
              </span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder="Sin meta"
                value={targets[item.type]}
                onChange={(e) =>
                  setTargets((t) => ({ ...t, [item.type]: e.target.value }))
                }
                className={inputClass}
              />
            </label>
          ))}
          {save.isError ? (
            <p className="text-sm text-destructive">
              {save.error instanceof ApiError
                ? save.error.message
                : "No se pudieron guardar las metas."}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Guardando…" : "Guardar metas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
