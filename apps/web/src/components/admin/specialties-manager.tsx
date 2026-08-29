"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextField } from "@/components/auth/text-field";
import { ApiError } from "@/lib/api-error";
import {
  useAdminSpecialties,
  useCreateSpecialty,
  useDeleteSpecialty,
  useUpdateSpecialty,
  type Specialty,
  type SpecialtyInput,
} from "@/lib/queries/specialties";

function slugifyName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function SpecialtyForm({
  defaultValues,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: Specialty;
  submitLabel: string;
  onSubmit: (input: SpecialtyInput) => Promise<void>;
}) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(
    String(defaultValues?.sortOrder ?? 0),
  );
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          await onSubmit({
            name: name.trim(),
            slug: slug.trim() || undefined,
            sortOrder: Number(sortOrder) || 0,
            isActive,
          });
        } catch (err) {
          setError(
            err instanceof ApiError ? err.message : "No se pudo guardar la especialidad",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <TextField
        label="Nombre"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!defaultValues && !slug) {
            setSlug(slugifyName(e.target.value));
          }
        }}
        placeholder="Ej. Cardiólogo"
        required
      />

      <TextField
        label="Slug (rol RBAC)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="cardiologo"
        pattern="^[a-z][a-z0-9_]*$"
      />
      <p className="-mt-2 text-xs text-muted-foreground">
        Solo minúsculas, números y guiones bajos. Se crea un rol con este nombre.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Orden"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Activa en registro
        </label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

export function SpecialtiesAdminPanel() {
  const query = useAdminSpecialties();
  const create = useCreateSpecialty();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [deleting, setDeleting] = useState<Specialty | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setCreating(true)}>
          Nueva especialidad
        </Button>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : null}
      {query.error ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar las especialidades.
        </p>
      ) : null}

      {query.data ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Orden</th>
                <th className="px-4 py-3 font-semibold">Doctores</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((specialty) => (
                <tr key={specialty.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{specialty.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{specialty.slug}</td>
                  <td className="px-4 py-3">{specialty.sortOrder}</td>
                  <td className="px-4 py-3">{specialty.doctorCount}</td>
                  <td className="px-4 py-3">
                    {specialty.isActive ? (
                      <span className="text-emerald-600">Activa</span>
                    ) : (
                      <span className="text-muted-foreground">Inactiva</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(specialty)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleting(specialty)}
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
      ) : null}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva especialidad</DialogTitle>
          </DialogHeader>
          <SpecialtyForm
            submitLabel="Crear"
            onSubmit={async (input) => {
              await create.mutateAsync(input);
              setCreating(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {editing ? (
        <EditDialog specialty={editing} onClose={() => setEditing(null)} />
      ) : null}
      {deleting ? (
        <DeleteDialog specialty={deleting} onClose={() => setDeleting(null)} />
      ) : null}
    </div>
  );
}

function EditDialog({
  specialty,
  onClose,
}: {
  specialty: Specialty;
  onClose: () => void;
}) {
  const update = useUpdateSpecialty(specialty.id);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar {specialty.name}</DialogTitle>
        </DialogHeader>
        <SpecialtyForm
          defaultValues={specialty}
          submitLabel="Guardar cambios"
          onSubmit={async (input) => {
            await update.mutateAsync(input);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  specialty,
  onClose,
}: {
  specialty: Specialty;
  onClose: () => void;
}) {
  const remove = useDeleteSpecialty();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {specialty.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">
            {specialty.doctorCount > 0 ? (
              <>
                Hay <strong>{specialty.doctorCount}</strong> doctor
                {specialty.doctorCount === 1 ? "" : "es"} con esta especialidad.
                No se puede eliminar hasta reasignarlos.
              </>
            ) : (
              "Se eliminará la especialidad y su rol RBAC asociado."
            )}
          </p>
          {remove.error ? (
            <p className="text-sm text-destructive">
              {remove.error instanceof ApiError
                ? remove.error.message
                : "No se pudo eliminar la especialidad."}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending || specialty.doctorCount > 0}
              onClick={async () => {
                await remove.mutateAsync(specialty.id);
                onClose();
              }}
            >
              {remove.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
