"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Baby,
  HelpCircle,
  Pencil,
  Plus,
  Scissors,
  Search,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { TextField } from "@/components/auth/text-field";
import { ApiError } from "@/lib/api-error";
import {
  useAdminSpecialties,
  useCreateSpecialty,
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

const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  dermatologo: Sparkles,
  medico_general: Stethoscope,
  cirujano_plastico: Scissors,
  estetica_medica: Sparkles,
  tricologo: Sparkles,
  dermatologo_pediatra: Baby,
  otra: HelpCircle,
};

function SpecialtyIcon({ slug }: { slug: string }) {
  const Icon = SPECIALTY_ICONS[slug] ?? Stethoscope;
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Activa
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
      Inactiva
    </span>
  );
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
  const [description, setDescription] = useState(defaultValues?.description ?? "");
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
            description: description.trim() || undefined,
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
        placeholder="Ej. Dermatólogo"
        required
      />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Descripción</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe el alcance y enfoque de la especialidad…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
      </label>

      <TextField
        label="Slug (rol RBAC)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="dermatologo"
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
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);

  const rows = useMemo(() => {
    const list = query.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q),
    );
  }, [query.data, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/configuracion" className="hover:text-foreground">
              Configuración
            </Link>{" "}
            › <span className="text-foreground">Especialidades</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Especialidades
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Gestiona las especialidades disponibles para clasificar a los
            profesionales. Para eliminar una especialidad, hazlo desde Roles y
            permisos (se elimina en cascada con su rol).
          </p>
        </div>
        <Button type="button" className="shrink-0" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Agregar especialidad
        </Button>
      </div>

      <ModuleCard>
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <ModuleCardTitle>Lista de especialidades</ModuleCardTitle>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar especialidad…"
              className="h-10 w-full rounded-xl border border-border bg-background pr-10 pl-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {query.isLoading ? (
          <p className="py-8 text-sm text-muted-foreground">Cargando…</p>
        ) : null}
        {query.error ? (
          <p className="py-8 text-sm text-destructive">
            No se pudieron cargar las especialidades.
          </p>
        ) : null}

        {rows.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-semibold">Especialidad</th>
                  <th className="px-4 py-3 font-semibold">Descripción</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((specialty) => (
                  <tr
                    key={specialty.id}
                    className="border-t border-border/80 align-top"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <SpecialtyIcon slug={specialty.slug} />
                        <span className="font-semibold text-foreground">
                          {specialty.name}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-4 text-muted-foreground">
                      {specialty.description ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge active={specialty.isActive} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditing(specialty)}
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : query.data ? (
          <p className="py-8 text-sm text-muted-foreground">
            No hay especialidades que coincidan con la búsqueda.
          </p>
        ) : null}
      </ModuleCard>

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

