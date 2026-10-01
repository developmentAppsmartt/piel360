"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { MoreVertical, Pencil, type LucideIcon } from "lucide-react";
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
import { useSetAccountDisabled } from "@/lib/queries/doctors";
import { cn } from "@/lib/utils";

export type AccountStatusTarget = {
  doctorId: string;
  name: string;
  disabledAt: string | null;
  disabledReason: string | null;
};

/** Columna Estado: Activo / Inactivo (el motivo va en el tooltip). */
export function AccountStateBadge({
  active,
  reason,
}: {
  active: boolean;
  reason?: string | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
      )}
      title={!active && reason ? `Motivo: ${reason}` : undefined}
    >
      <span
        className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-rose-500")}
      />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function StatusSwitch({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
        checked ? "bg-primary" : "bg-muted-foreground/35",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function MiniSwitch({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full",
        on ? "bg-emerald-500" : "bg-rose-500",
      )}
    >
      <span
        className={cn(
          "inline-block size-2.5 rounded-full bg-white",
          on ? "translate-x-3" : "translate-x-0.5",
        )}
      />
    </span>
  );
}

export type RowMenuLink = { label: string; href: string; icon?: LucideIcon };

/**
 * Columna Acciones: switch activo/inactivo, lápiz para editar y menú ⋮ con
 * Editar / Activar / Desactivar (más enlaces opcionales).
 */
export function AccountRowActions({
  active,
  editHref,
  onToggle,
  extraLinks = [],
}: {
  active: boolean;
  editHref: string;
  /** Abre el diálogo: pedir motivo al desactivar o confirmar al activar. */
  onToggle: () => void;
  extraLinks?: RowMenuLink[];
}) {
  const router = useRouter();
  const itemClass =
    "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-40 data-highlighted:bg-muted";

  return (
    <div className="flex items-center justify-end gap-2">
      <StatusSwitch
        checked={active}
        onToggle={onToggle}
        label={active ? "Desactivar cuenta" : "Activar cuenta"}
      />
      <Link
        href={editHref}
        aria-label="Editar"
        title="Editar"
        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary transition-colors hover:bg-primary/5"
      >
        <Pencil className="size-4" />
      </Link>
      <Menu.Root>
        <Menu.Trigger
          aria-label="Más acciones"
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted data-popup-open:bg-muted"
        >
          <MoreVertical className="size-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
            <Menu.Popup className="min-w-40 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
              <Menu.Item className={itemClass} onClick={() => router.push(editHref)}>
                <Pencil className="size-4 text-muted-foreground" />
                Editar
              </Menu.Item>
              {extraLinks.map((link) => (
                <Menu.Item
                  key={link.href}
                  className={itemClass}
                  onClick={() => router.push(link.href)}
                >
                  {link.icon ? (
                    <link.icon className="size-4 text-muted-foreground" />
                  ) : null}
                  {link.label}
                </Menu.Item>
              ))}
              <Menu.Item
                className={cn(itemClass, "text-emerald-700")}
                disabled={active}
                onClick={onToggle}
              >
                <MiniSwitch on />
                Activar
              </Menu.Item>
              <Menu.Item
                className={cn(itemClass, "text-rose-600")}
                disabled={!active}
                onClick={onToggle}
              >
                <MiniSwitch on={false} />
                Desactivar
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

export function AccountStatusDialog({
  scope,
  target,
  onOpenChange,
}: {
  scope: "doctor" | "empresa";
  target: AccountStatusTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useSetAccountDisabled(scope);
  const isDisabled = Boolean(target?.disabledAt);
  const subject = scope === "empresa" ? "la empresa" : "el profesional";

  const close = () => {
    setReason("");
    setError(null);
    onOpenChange(false);
  };

  const submit = () => {
    if (!target) return;
    const trimmed = reason.trim();
    if (!isDisabled && !trimmed) {
      setError("Escribe el motivo: es lo que verá el usuario al iniciar sesión.");
      return;
    }
    setError(null);
    void mutation
      .mutateAsync({
        doctorId: target.doctorId,
        disabled: !isDisabled,
        reason: isDisabled ? undefined : trimmed,
      })
      .then(close)
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "No se pudo actualizar el estado.",
        );
      });
  };

  return (
    <Dialog open={target != null} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDisabled ? "Activar cuenta" : "Desactivar cuenta"}
          </DialogTitle>
          <DialogDescription>
            {isDisabled ? (
              <>
                <strong>{target?.name}</strong> volverá a tener acceso normal a la
                plataforma.
              </>
            ) : (
              <>
                <strong>{target?.name}</strong> podrá iniciar sesión, pero en el CRM y
                en la app solo verá una pantalla de cuenta desactivada con el
                motivo que escribas.
                {scope === "empresa"
                  ? " Los profesionales de su equipo también quedarán bloqueados."
                  : null}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isDisabled ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3 text-sm">
            <p className="text-xs font-semibold tracking-wide text-rose-700 uppercase">
              Motivo actual
            </p>
            <p className="mt-1 whitespace-pre-line text-foreground">
              {target?.disabledReason || "Sin observación registrada."}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="account-disabled-reason" className="text-sm font-medium">
              Observación / motivo
            </label>
            <textarea
              id="account-disabled-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder={`Explica por qué se desactiva ${subject}…`}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-right text-xs text-muted-foreground">
              {reason.length}/1000
            </p>
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant={isDisabled ? "default" : "destructive"}
            onClick={submit}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? "Guardando…"
              : isDisabled
                ? "Activar"
                : "Desactivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
