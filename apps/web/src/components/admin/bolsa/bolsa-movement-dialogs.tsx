"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateAnalisisDermaPiel360Recharge } from "@/lib/queries/admin-bolsa-units";
import { ApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import {
  EMPTY_AESTHETIC_POOL,
  PoolIcon,
  formatUnits,
  type UnitPool,
} from "@/components/admin/bolsa/unit-pools";
import {
  movementStatusBadgeClass,
  type MovementRow,
} from "@/components/admin/bolsa/bolsa-movement-model";

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function MovementDetailDialog({
  movement,
  pools,
  open,
  onOpenChange,
}: {
  movement: MovementRow | null;
  pools: UnitPool[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!movement) return null;
  const pool =
    pools.find((p) => p.id === movement.unitType) ?? pools[0] ?? EMPTY_AESTHETIC_POOL;
  const signedQty =
    movement.delta < 0
      ? `−${formatUnits(movement.quantity)}`
      : `+${formatUnits(movement.quantity)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del movimiento</DialogTitle>
          <DialogDescription>
            Información registrada para este movimiento de la bolsa de unidades.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3">
            <PoolIcon pool={pool} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{movement.unitLabel}</p>
              <p className="text-xs text-muted-foreground">
                {movement.source === "analisispiel360" ? "Estético" : "Dermatológico"}
              </p>
            </div>
            <Badge className={movementStatusBadgeClass(movement.status)}>
              {movement.status}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Fecha">{movement.rechargedAt}</DetailField>
            <DetailField label="Cantidad">
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  movement.delta < 0 && "text-destructive",
                )}
              >
                {signedQty}{" "}
                <span className="font-normal text-muted-foreground">
                  {pool.unitLabel}
                </span>
              </span>
            </DetailField>
            <DetailField label="Vencimiento">{movement.expiresAt}</DetailField>
            <DetailField label="Acción">{movement.actionLabel}</DetailField>
            <DetailField label="Origen">{movement.addedBy}</DetailField>
            {movement.addedByEmail ? (
              <DetailField label="Correo">{movement.addedByEmail}</DetailField>
            ) : null}
            {movement.rawKind ? (
              <DetailField label="Tipo interno">
                <span className="font-mono text-xs">{movement.rawKind}</span>
              </DetailField>
            ) : null}
            {movement.targetId ? (
              <DetailField label="Referencia / target">
                <span className="font-mono text-xs break-all">{movement.targetId}</span>
              </DetailField>
            ) : null}
          </div>

          {movement.note ? (
            <DetailField label="Nota">
              <p className="rounded-lg border border-border bg-background px-3 py-2 whitespace-pre-wrap">
                {movement.note}
              </p>
            </DetailField>
          ) : null}

          {movement.dstActions.length > 0 ? (
            <DetailField label="Acciones del proveedor (dst)">
              <ul className="flex flex-wrap gap-1.5">
                {movement.dstActions.map((action) => (
                  <li key={action}>
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      {action}
                    </Badge>
                  </li>
                ))}
              </ul>
            </DetailField>
          ) : null}

          <DetailField label="ID del movimiento">
            <span className="font-mono text-xs break-all text-muted-foreground">
              {movement.id}
            </span>
          </DetailField>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AnalisisDermaPiel360RechargeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recharge = useCreateAnalisisDermaPiel360Recharge();

  const reset = () => {
    setQuantity("");
    setExpiresAt("");
    setNote("");
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recargar créditos dermatológicos</DialogTitle>
          <DialogDescription>
            Registra una compra o renovación de créditos dermatológicos. El
            saldo disponible se calcula como recargas activas menos análisis
            realizados en la plataforma.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const parsed = Number(quantity.replace(/\./g, "").replace(",", "."));
            if (!Number.isFinite(parsed) || parsed < 1) {
              setError("Ingresa una cantidad válida (mínimo 1).");
              return;
            }
            void recharge
              .mutateAsync({
                quantity: Math.round(parsed),
                expiresAt: expiresAt.trim() || undefined,
                note: note.trim() || undefined,
              })
              .then(() => {
                reset();
                onOpenChange(false);
              })
              .catch((err) => {
                setError(
                  err instanceof ApiError
                    ? err.message
                    : "No se pudo registrar la recarga.",
                );
              });
          }}
        >
          <div className="space-y-1.5">
            <label
              htmlFor="analisisdermapiel360-quantity"
              className="text-sm font-medium"
            >
              Cantidad de créditos
            </label>
            <input
              id="analisisdermapiel360-quantity"
              type="number"
              min={1}
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej. 3000"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="analisisdermapiel360-expires" className="text-sm font-medium">
              Vencimiento (opcional)
            </label>
            <input
              id="analisisdermapiel360-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="analisisdermapiel360-note" className="text-sm font-medium">
              Nota / referencia (opcional)
            </label>
            <textarea
              id="analisisdermapiel360-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Factura, orden de compra, contacto del proveedor…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={recharge.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={recharge.isPending}>
              {recharge.isPending ? "Registrando…" : "Registrar recarga"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
