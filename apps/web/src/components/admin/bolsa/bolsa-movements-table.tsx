"use client";

import { CalendarDays, Eye, Filter, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";
import {
  PoolIcon,
  formatUnits,
  type UnitPool,
} from "@/components/admin/bolsa/unit-pools";
import {
  movementStatusBadgeClass,
  type BolsaTypeFilter,
  type MovementRow,
} from "@/components/admin/bolsa/bolsa-movement-model";

export function BolsaMovementsTable({
  rows,
  loading,
  typeFilter,
  onTypeFilter,
  pools,
  fallbackPool,
  onSelect,
}: {
  rows: MovementRow[];
  loading: boolean;
  typeFilter: BolsaTypeFilter;
  onTypeFilter: (next: BolsaTypeFilter) => void;
  pools: UnitPool[];
  fallbackPool: UnitPool;
  onSelect: (row: MovementRow) => void;
}) {
  return (
    <ModuleCard className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <ModuleCardTitle className="text-base">
          Movimientos de unidades
        </ModuleCardTitle>
        <div className="flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilter(e.target.value as BolsaTypeFilter)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todos los tipos</option>
            <option value="aesthetic">Análisis estéticos / Fitzpatrick</option>
            <option value="derm">Análisis dermatológico</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-muted-foreground"
          >
            <CalendarDays className="size-4" />
            Historial Estético
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <Filter className="size-4" />
            Filtros
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
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
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Cargando movimientos…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No hay movimientos registrados para este filtro.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <PoolIcon
                        pool={
                          pools.find((p) => p.id === row.unitType) ??
                          fallbackPool
                        }
                      />
                      <span className="font-medium">{row.unitLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.rechargedAt}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-medium tabular-nums",
                      row.delta < 0 && "text-destructive",
                    )}
                  >
                    {row.delta < 0 ? "−" : "+"}
                    {formatUnits(row.quantity)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.expiresAt}
                  </td>
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
