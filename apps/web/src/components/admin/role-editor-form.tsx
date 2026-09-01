"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { RolePermissionsMatrix } from "@/components/admin/role-permissions-matrix";
import { RoleVisibilityPreview } from "@/components/admin/role-visibility-preview";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { useAdminLaborTechnicianProfiles } from "@/lib/queries/labor-technician-profiles";
import { usePermissions, type Role, type RoleInput } from "@/lib/queries/roles";
import { useAdminSpecialties } from "@/lib/queries/specialties";

const ROLE_COLORS = [
  { value: "#6C4FFB", label: "Morado" },
  { value: "#2563EB", label: "Azul" },
  { value: "#059669", label: "Verde" },
  { value: "#D97706", label: "Ámbar" },
  { value: "#DC2626", label: "Rojo" },
  { value: "#64748B", label: "Gris" },
] as const;

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border pb-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function SpecialtyMultiSelect({
  options,
  value,
  onChange,
}: {
  options: { id: string; name: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = options.filter((option) => value.includes(option.id));
  const available = options.filter((option) => !value.includes(option.id));

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Especialidad <span className="font-normal text-muted-foreground">(Opcional)</span>
      </label>
      <div className="min-h-10 rounded-xl border border-border bg-background px-3 py-2">
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
              >
                {item.name}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-indigo-100"
                  onClick={() => onChange(value.filter((id) => id !== item.id))}
                >
                  <X className="size-3" />
                  <span className="sr-only">Quitar {item.name}</span>
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin especialidades asociadas</p>
        )}
      </div>
      <select
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        value=""
        onChange={(e) => {
          const id = e.target.value;
          if (id && !value.includes(id)) onChange([...value, id]);
        }}
      >
        <option value="">Selecciona una especialidad</option>
        {available.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RoleEditorForm({
  mode,
  defaultValues,
  onSubmit,
}: {
  mode: "create" | "edit";
  defaultValues?: Role;
  onSubmit: (input: RoleInput) => Promise<void>;
}) {
  const router = useRouter();
  const specialties = useAdminSpecialties();
  const laborProfiles = useAdminLaborTechnicianProfiles();
  const permissionsQuery = usePermissions();

  const [label, setLabel] = useState(defaultValues?.label ?? defaultValues?.name ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [color, setColor] = useState(defaultValues?.color ?? "#6C4FFB");
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);
  const [specialtyIds, setSpecialtyIds] = useState<string[]>(
    defaultValues?.specialtyLinks.map((link) => link.doctorSpecialtyId) ?? [],
  );
  const [laborTechnicianProfileId, setLaborTechnicianProfileId] = useState(
    defaultValues?.laborTechnicianProfileId ?? "",
  );
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(
    () => new Set(defaultValues?.permissions.map((permission) => permission.id) ?? []),
  );
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "saveAnother" | null>(null);

  const specialtyOptions = useMemo(
    () => specialties.data?.map((item) => ({ id: item.id, name: item.name })) ?? [],
    [specialties.data],
  );

  async function handleSubmit(createAnother: boolean) {
    if (!label.trim()) {
      setError("El nombre del rol es requerido.");
      return;
    }
    if (permissionsQuery.isError) {
      setError("No se pudo cargar el catálogo de permisos. Recarga la página e inicia sesión de nuevo.");
      return;
    }

    setError(null);
    setPendingAction(createAnother ? "saveAnother" : "save");
    try {
      await onSubmit({
        label: label.trim(),
        description: description.trim() || undefined,
        color,
        isActive,
        specialtyIds,
        laborTechnicianProfileId: laborTechnicianProfileId || null,
        permissionIds: [...selectedPermissionIds],
      });

      if (createAnother) {
        setLabel("");
        setDescription("");
        setColor("#6C4FFB");
        setIsActive(true);
        setSpecialtyIds([]);
        setLaborTechnicianProfileId("");
        setSelectedPermissionIds(new Set());
        return;
      }

      router.push("/admin/roles");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el rol.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/admin/configuracion" className="hover:text-foreground">
            Configuración
          </Link>{" "}
          ›{" "}
          <Link href="/admin/roles" className="hover:text-foreground">
            Roles y permisos
          </Link>{" "}
          › <span className="text-foreground">{mode === "create" ? "Crear rol" : "Editar rol"}</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {mode === "create" ? "Crear rol y permisos" : `Editar ${defaultValues?.label ?? defaultValues?.name}`}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Asigna módulos y permisos a cualquier rol del sistema (dermatólogo, empresa,
          técnico, etc.). Lo que marques aquí define el menú y las acciones de los usuarios
          con ese rol. Los análisis por especialidad se configuran en{" "}
          <Link href="/admin/roles/permisos-planes" className="text-primary underline">
            Permisos de planes
          </Link>
          .
        </p>
      </div>

      <ModuleCard className="space-y-6">
        <SectionTitle title="Información del rol" />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Nombre del rol"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej. Cosmetólogo"
            required
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Estado</span>
            <select
              value={isActive ? "active" : "inactive"}
              onChange={(e) => setIsActive(e.target.value === "active")}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Color del rol</span>
            <div className="flex items-center gap-2">
              <span
                className="size-8 shrink-0 rounded-md border border-border"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              >
                {ROLE_COLORS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({item.value})
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Descripción</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe el propósito y alcance de este rol…"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </ModuleCard>

      <ModuleCard className="space-y-6">
        <SectionTitle
          title="Asociar a"
          description="Vincula este rol con una especialidad médica o un perfil de técnico laboral."
        />
        <div className="grid gap-6 md:grid-cols-2">
          <SpecialtyMultiSelect
            options={specialtyOptions}
            value={specialtyIds}
            onChange={setSpecialtyIds}
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">
              Técnico laboral{" "}
              <span className="font-normal text-muted-foreground">(Opcional)</span>
            </span>
            <select
              value={laborTechnicianProfileId}
              onChange={(e) => setLaborTechnicianProfileId(e.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Selecciona un técnico laboral</option>
              {(laborProfiles.data ?? []).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </ModuleCard>

      <ModuleCard className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <ModuleCardTitle>Permisos del rol</ModuleCardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Marca los módulos de menú admin y/o clínico. Cada tarjeta controla una
              entrada del sidebar. Sin restricciones por tipo de rol.
            </p>
          </div>
        </div>
        <RoleVisibilityPreview
          roleName={defaultValues?.name ?? (label.trim() || "nuevo_rol")}
          permissionsCatalog={permissionsQuery.data ?? []}
          selectedPermissionIds={selectedPermissionIds}
        />
        <RolePermissionsMatrix
          permissions={permissionsQuery.data ?? []}
          selected={selectedPermissionIds}
          onChange={setSelectedPermissionIds}
          loading={permissionsQuery.isLoading}
        />
        {permissionsQuery.isError ? (
          <p className="text-sm text-destructive">
            No se pudieron cargar los permisos (sesión expirada). Cierra sesión en admin y vuelve a
            entrar antes de guardar.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Los usuarios con este rol verán los cambios al volver a iniciar sesión o al
            recargar el panel.
          </p>
        )}
      </ModuleCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" nativeButton={false} render={<Link href="/admin/roles" />}>
          Cancelar
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          {mode === "create" ? (
            <Button
              type="button"
              variant="outline"
              disabled={pendingAction !== null}
              onClick={() => handleSubmit(true)}
            >
              {pendingAction === "saveAnother" ? "Guardando…" : "Guardar y crear otro"}
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={pendingAction !== null}
            onClick={() => handleSubmit(false)}
          >
            {pendingAction === "save" ? "Guardando…" : "Guardar rol"}
          </Button>
        </div>
      </div>
    </div>
  );
}
