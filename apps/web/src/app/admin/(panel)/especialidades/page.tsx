"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import {
  useAdminSpecialties,
  useCreateSpecialty,
  useDeleteSpecialty,
  useUpdateSpecialty,
  type Specialty,
} from "@/lib/queries/specialties";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-sky-500";

function SpecialtyFormDialog({
  specialty,
  open,
  onClose,
}: {
  specialty: Specialty | null;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateSpecialty();
  const update = useUpdateSpecialty(specialty?.id ?? "");
  const [name, setName] = useState(specialty?.name ?? "");
  const [sortOrder, setSortOrder] = useState(
    String(specialty?.sortOrder ?? ""),
  );
  const [isActive, setIsActive] = useState(specialty?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    const order =
      sortOrder.trim() === "" ? undefined : Number.parseInt(sortOrder, 10);
    if (order !== undefined && !Number.isFinite(order)) {
      setError("Orden inválido.");
      return;
    }
    try {
      if (specialty) {
        await update.mutateAsync({
          name: trimmed,
          sortOrder: order,
          isActive,
        });
      } else {
        await create.mutateAsync({
          name: trimmed,
          sortOrder: order,
          isActive,
        });
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? Array.isArray(err.message)
            ? err.message.join(", ")
            : err.message
          : "No se pudo guardar.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {specialty ? "Editar especialidad" : "Nueva especialidad"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nombre</span>
            <input
              className={inputClass}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Orden</span>
            <input
              className={inputClass}
              type="number"
              placeholder="Automático"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4"
            />
            Activa (visible en registro)
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminEspecialidadesPage() {
  const query = useAdminSpecialties();
  const remove = useDeleteSpecialty();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Especialidades</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo usado en el registro y perfil de médicos.
          </p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          Añadir especialidad
        </Button>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar las especialidades.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Orden</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 tabular-nums">{s.sortOrder}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">
                    {s.isActive ? (
                      <span className="text-emerald-700">Activa</span>
                    ) : (
                      <span className="text-muted-foreground">Inactiva</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(s)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (
                            !confirm(
                              `¿Eliminar la especialidad «${s.name}»? Los médicos que ya la tienen guardada conservan el texto.`,
                            )
                          ) {
                            return;
                          }
                          remove.mutate(s.id);
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating ? (
        <SpecialtyFormDialog
          specialty={null}
          open
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <SpecialtyFormDialog
          key={editing.id}
          specialty={editing}
          open
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
