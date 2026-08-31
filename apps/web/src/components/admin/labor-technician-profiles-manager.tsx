"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { TextField } from "@/components/auth/text-field";
import { ApiError } from "@/lib/api-error";
import {
  useAdminLaborTechnicianProfiles,
  useCreateLaborTechnicianProfile,
  useDeleteLaborTechnicianProfile,
  useUpdateLaborTechnicianProfile,
  type LaborTechnicianProfile,
  type LaborTechnicianProfileInput,
} from "@/lib/queries/labor-technician-profiles";

const PAGE_SIZE = 10;

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

function ProfileIcon() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
      <Sparkles className="size-4" aria-hidden />
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Activo
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
      Inactivo
    </span>
  );
}

function ProfileForm({
  defaultValues,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: LaborTechnicianProfile;
  submitLabel: string;
  onSubmit: (input: LaborTechnicianProfileInput) => Promise<void>;
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
            err instanceof ApiError
              ? err.message
              : "No se pudo guardar el perfil",
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
        placeholder="Ej. Técnico laboral en cosmetología y estética"
        required
      />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Descripción</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe el perfil profesional y su alcance…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
      </label>

      <TextField
        label="Slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="tecnico_laboral_cosmetologia"
        pattern="^[a-z][a-z0-9_]*$"
      />

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
          Activo
        </label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

function WhyManageSection() {
  const benefits = [
    {
      icon: Shield,
      title: "Control de acceso",
      description: "Define permisos y accesos específicos.",
    },
    {
      icon: Users,
      title: "Organización",
      description: "Mantén tu equipo estructurado.",
    },
    {
      icon: TrendingUp,
      title: "Mejores resultados",
      description: "Optimiza procesos y mejora la experiencia.",
    },
  ];

  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <UserPlus className="size-7" aria-hidden />
        </div>
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              ¿Por qué gestionar técnicos laborales?
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Mantén un registro organizado de los técnicos laborales de tu equipo
              y asigna sus permisos para optimizar la atención a tus pacientes.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {benefits.map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                  <item.icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LaborTechnicianProfilesAdminPanel() {
  const query = useAdminLaborTechnicianProfiles();
  const create = useCreateLaborTechnicianProfile();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LaborTechnicianProfile | null>(null);
  const [deleting, setDeleting] = useState<LaborTechnicianProfile | null>(null);

  const filteredRows = useMemo(() => {
    const list = query.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q),
    );
  }, [query.data, search]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const rows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const showingFrom = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/configuracion" className="hover:text-foreground">
              Configuración
            </Link>{" "}
            › <span className="text-foreground">Técnico laboral</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Técnico laboral
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Gestiona los perfiles de técnicos laborales disponibles en tu
            organización.
          </p>
        </div>
        <Button type="button" className="shrink-0" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Agregar técnico laboral
        </Button>
      </div>

      <ModuleCard>
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <ModuleCardTitle>Lista de técnicos laborales</ModuleCardTitle>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar técnico laboral…"
              className="h-10 w-full rounded-xl border border-border bg-background pr-10 pl-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {query.isLoading ? (
          <p className="py-8 text-sm text-muted-foreground">Cargando…</p>
        ) : null}
        {query.error ? (
          <p className="py-8 text-sm text-destructive">
            No se pudieron cargar los perfiles de técnico laboral.
          </p>
        ) : null}

        {rows.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-3 font-semibold">Técnico laboral</th>
                    <th className="px-4 py-3 font-semibold">Descripción</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((profile) => (
                    <tr
                      key={profile.id}
                      className="border-t border-border/80 align-top"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <ProfileIcon />
                          <span className="font-semibold text-foreground">
                            {profile.name}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-md px-4 py-4 text-muted-foreground">
                        {profile.description ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge active={profile.isActive} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditing(profile)}
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(profile)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {total === 0
                  ? "Sin resultados"
                  : `Mostrando ${showingFrom}${showingTo > showingFrom ? `–${showingTo}` : ""} de ${total} técnico${total === 1 ? "" : "s"} laboral${total === 1 ? "" : "es"}`}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  <span className="sr-only">Anterior</span>
                </Button>
                <span className="flex size-8 items-center justify-center rounded-md border border-primary/30 bg-primary/5 text-sm font-medium text-primary">
                  {currentPage}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="size-4" />
                  <span className="sr-only">Siguiente</span>
                </Button>
              </div>
            </div>
          </>
        ) : query.data ? (
          <p className="py-8 text-sm text-muted-foreground">
            {search.trim()
              ? "No hay perfiles que coincidan con la búsqueda."
              : "No hay perfiles de técnico laboral registrados."}
          </p>
        ) : null}
      </ModuleCard>

      <WhyManageSection />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo técnico laboral</DialogTitle>
          </DialogHeader>
          <ProfileForm
            submitLabel="Crear"
            onSubmit={async (input) => {
              await create.mutateAsync(input);
              setCreating(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {editing ? (
        <EditDialog profile={editing} onClose={() => setEditing(null)} />
      ) : null}
      {deleting ? (
        <DeleteDialog profile={deleting} onClose={() => setDeleting(null)} />
      ) : null}
    </div>
  );
}

function EditDialog({
  profile,
  onClose,
}: {
  profile: LaborTechnicianProfile;
  onClose: () => void;
}) {
  const update = useUpdateLaborTechnicianProfile(profile.id);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar {profile.name}</DialogTitle>
        </DialogHeader>
        <ProfileForm
          defaultValues={profile}
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
  profile,
  onClose,
}: {
  profile: LaborTechnicianProfile;
  onClose: () => void;
}) {
  const remove = useDeleteLaborTechnicianProfile();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {profile.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">
            Se eliminará este perfil del catálogo y su rol RBAC asociado. Los
            permisos de planes configurados en{" "}
            <Link href="/admin/roles/permisos-planes" className="underline">
              Permisos de planes
            </Link>{" "}
            también se perderán.
          </p>
          {remove.error ? (
            <p className="text-sm text-destructive">
              {remove.error instanceof ApiError
                ? remove.error.message
                : "No se pudo eliminar el perfil."}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={async () => {
                await remove.mutateAsync(profile.id);
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
