"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_MODERATOR_PERMISSIONS,
  MODERATOR_PERMISSION_LABELS,
  MODERATOR_PERMISSIONS,
  type ModeratorPermission,
} from "@piel360/shared";
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
  useUpdateModeratorPermissions,
  type Moderator,
} from "@/lib/queries/moderators";

export function ModeratorPermissionsDialog({
  moderator,
  open,
  onOpenChange,
}: {
  moderator: Moderator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateModeratorPermissions(moderator?.id ?? "");
  const [selected, setSelected] = useState<ModeratorPermission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !moderator) return;
    setSelected(
      moderator.permissions?.length
        ? [...moderator.permissions]
        : [...DEFAULT_MODERATOR_PERMISSIONS],
    );
    setError(null);
  }, [open, moderator]);

  function toggle(perm: ModeratorPermission) {
    setSelected((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Permisos del moderador</DialogTitle>
          <DialogDescription>
            {moderator
              ? `Gestión de profesionales — ${moderator.firstName} ${moderator.lastName} (${moderator.user.email})`
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            A. Gestión de profesionales
          </p>
          {MODERATOR_PERMISSIONS.map((perm) => (
            <label
              key={perm}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={selected.includes(perm)}
                onChange={() => toggle(perm)}
              />
              <span>{MODERATOR_PERMISSION_LABELS[perm]}</span>
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            Por defecto no se permiten cambiar profesión, editar datos
            personales ni eliminar usuarios. Puede solicitar correcciones sin
            editar directamente.
          </p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={update.isPending || !moderator}
            onClick={async () => {
              if (!moderator) return;
              setError(null);
              try {
                await update.mutateAsync(selected);
                onOpenChange(false);
              } catch (err) {
                setError(
                  err instanceof ApiError
                    ? Array.isArray(err.message)
                      ? err.message.join(", ")
                      : err.message
                    : "No se pudieron guardar los permisos.",
                );
              }
            }}
          >
            {update.isPending ? "Guardando…" : "Guardar permisos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
