"use client";

import { Eye, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";
import {
  PoolIcon,
  formatUnits,
  type UnitPool,
} from "@/components/admin/bolsa/unit-pools";
import {
  movementStatusBadgeClass,
  type MovementRow,
} from "@/components/admin/bolsa/bolsa-movement-model";
import type { ReactNode } from "react";

export function BolsaMovementsTable({
  rows,
  loading,
  pools,
  fallbackPool,
  onSelect,
  toolbar,
  emptyLabel,
  title = "Créditos asignados a planes",
}: {
  rows: MovementRow[];
  loading: boolean;
  pools: UnitPool[];
  fallbackPool: UnitPool;
  onSelect: (row: MovementRow) => void;
  toolbar: ReactNode;
  emptyLabel: string;
  title?: string;
}) {
  return (
    <ModuleCard className="min-w-0 overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <ModuleCardTitle className="text-base">
          {title}
        </ModuleCardTitle>
        {toolbar}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Tipo de unidad</th>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Cantidad</th>
              <th className="px-4 py-3 font-semibold">Fecha de vencimiento</th>
              <th className="px-4 py-3 font-semibold">Origen / acción</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando movimientos…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <PoolIcon
                        pool={pools.find((p) => p.id === row.unitType) ?? fallbackPool}
                      />
                      <span className="font-medium">{row.unitLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.rechargedAt}</td>
                  <td
                    className={cn(
                      "px-4 py-3 font-medium tabular-nums",
                      row.delta < 0 && "text-destructive",
                    )}
                  >
                    {row.delta < 0 ? "−" : "+"}
                    {formatUnits(row.quantity)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.expiresAt}</td>
                  <td className="px-4 py-3">{row.addedBy}</td>
                  <td className="px-4 py-3">
                    <Badge className={movementStatusBadgeClass(row.status)}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Ver detalle"
                        onClick={() => onSelect(row)}
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                        aria-label="Más acciones"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Mostrando {rows.length} movimiento{rows.length === 1 ? "" : "s"}
      </div>
    </ModuleCard>
  );
}
