"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Permission } from "@/lib/queries/roles";
import {
  adminComponentPermissionIds,
  allPermissionIds,
  assignablePermissions,
  clinicalComponentPermissionIds,
  groupPermissionsBySection,
} from "@/lib/permission-catalog";
import type { PermissionScope } from "@/lib/role-permission-scope";
import { cn } from "@/lib/utils";

const SCOPE_LABELS: Record<PermissionScope, string> = {
  admin_menu: "Menú admin",
  clinical_menu: "Menú clínico",
  api_only: "Solo API",
};

const SCOPE_STYLES: Record<PermissionScope, string> = {
  admin_menu: "bg-primary/10 text-primary",
  clinical_menu: "bg-sky-50 text-sky-700",
  api_only: "bg-muted text-muted-foreground",
};

type SelectionMode = "id" | "name";

type PermissionGroup = ReturnType<typeof groupPermissionsBySection>[number]["groups"][number];

function CollapsibleSection({
  title,
  selectedCount,
  totalCount,
  defaultOpen = false,
  children,
}: {
  title: string;
  selectedCount: number;
  totalCount: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
            aria-hidden
          />
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {selectedCount}/{totalCount}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "Ocultar" : "Mostrar"}</span>
      </button>
      {open ? <div className="border-t border-border px-4 py-3">{children}</div> : null}
    </div>
  );
}

function MenuModuleRow({
  group,
  selected,
  selectionMode,
  onToggle,
}: {
  group: PermissionGroup;
  selected: Set<string>;
  selectionMode: SelectionMode;
  onToggle: (key: string) => void;
}) {
  const permission = group.permissions[0];
  if (!permission) return null;

  const key = selectionMode === "name" ? permission.name : permission.id;

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/80 bg-background px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <input
        type="checkbox"
        className="size-4 shrink-0 accent-primary"
        checked={selected.has(key)}
        onChange={() => onToggle(key)}
      />
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
        <group.icon className="size-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{group.label}</p>
        <p className="truncate text-xs text-muted-foreground">{permission.label}</p>
      </div>
      <span
        className={cn(
          "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase sm:inline-flex",
          SCOPE_STYLES[group.scope],
        )}
      >
        {SCOPE_LABELS[group.scope]}
      </span>
    </label>
  );
}

function ApiPermissionGroupCard({
  group,
  selected,
  selectionMode,
  onToggle,
  onToggleGroup,
  defaultOpen = false,
}: {
  group: PermissionGroup;
  selected: Set<string>;
  selectionMode: SelectionMode;
  onToggle: (key: string) => void;
  onToggleGroup: (permissions: { id: string; name: string }[]) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  function keyFor(permission: { id: string; name: string }) {
    return selectionMode === "name" ? permission.name : permission.id;
  }

  const groupKeys = group.permissions.map((permission) => keyFor(permission));
  const groupSelected =
    groupKeys.length > 0 && groupKeys.every((key) => selected.has(key));
  const selectedInGroup = groupKeys.filter((key) => selected.has(key)).length;

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-muted"
          aria-expanded={open}
          aria-label={open ? "Contraer permisos" : "Expandir permisos"}
        >
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
          />
        </button>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
          <group.icon className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-foreground">{group.label}</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedInGroup}/{group.permissions.length} seleccionados
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-primary hover:underline"
              onClick={() => onToggleGroup(group.permissions)}
            >
              {groupSelected ? "Quitar" : "Todos"}
            </button>
          </div>
        </div>
      </div>
      {open ? (
        <ul className="space-y-1.5 border-t border-border px-3 py-2.5">
          {group.permissions.map((permission) => {
            const key = keyFor(permission);
            return (
              <li key={permission.id}>
                <label className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-primary"
                    checked={selected.has(key)}
                    onChange={() => onToggle(key)}
                  />
                  <span className="text-foreground">{permission.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function countSelectedInGroups(
  groups: PermissionGroup[],
  selected: Set<string>,
  selectionMode: SelectionMode,
): number {
  let count = 0;
  for (const group of groups) {
    for (const permission of group.permissions) {
      const key = selectionMode === "name" ? permission.name : permission.id;
      if (selected.has(key)) count += 1;
    }
  }
  return count;
}

function countTotalInGroups(groups: PermissionGroup[]): number {
  return groups.reduce((sum, group) => sum + group.permissions.length, 0);
}

export function RolePermissionsMatrix({
  permissions,
  selected,
  onChange,
  selectionMode = "id",
  loading = false,
}: {
  permissions: Permission[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  selectionMode?: SelectionMode;
  loading?: boolean;
}) {
  const assignable = useMemo(() => assignablePermissions(permissions), [permissions]);
  const sections = useMemo(
    () => groupPermissionsBySection(assignable),
    [assignable],
  );

  const allKeys = useMemo(() => {
    if (selectionMode === "name") {
      return assignable.map((permission) => permission.name);
    }
    return allPermissionIds(assignable);
  }, [assignable, selectionMode]);

  const adminModuleIds = useMemo(
    () => adminComponentPermissionIds(assignable),
    [assignable],
  );

  const clinicalModuleIds = useMemo(
    () => clinicalComponentPermissionIds(assignable),
    [assignable],
  );

  const allAdminModulesSelected =
    adminModuleIds.length > 0 &&
    adminModuleIds.every((id) => selected.has(id));

  const allClinicalModulesSelected =
    clinicalModuleIds.length > 0 &&
    clinicalModuleIds.every((id) => selected.has(id));

  function keyFor(permission: { id: string; name: string }) {
    return selectionMode === "name" ? permission.name : permission.id;
  }

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function toggleGroup(groupPermissionsList: { id: string; name: string }[]) {
    const keys = groupPermissionsList.map((permission) => keyFor(permission));
    const everySelected = keys.every((key) => selected.has(key));
    const next = new Set(selected);
    for (const key of keys) {
      if (everySelected) next.delete(key);
      else next.add(key);
    }
    onChange(next);
  }

  function selectAdminModules() {
    const next = new Set(selected);
    for (const id of adminModuleIds) {
      next.add(id);
    }
    onChange(next);
  }

  function clearAdminModules() {
    const next = new Set(selected);
    for (const id of adminModuleIds) {
      next.delete(id);
    }
    onChange(next);
  }

  function selectClinicalModules() {
    const next = new Set(selected);
    for (const id of clinicalModuleIds) {
      next.add(id);
    }
    onChange(next);
  }

  function clearClinicalModules() {
    const next = new Set(selected);
    for (const id of clinicalModuleIds) {
      next.delete(id);
    }
    onChange(next);
  }

  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key));

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando permisos…</p>;
  }

  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay permisos configurados en la base de datos.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Expande cada sección para marcar módulos. Solo los checkboxes activos controlan el menú
          del usuario.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onChange(new Set(allKeys))}
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() =>
              allAdminModulesSelected ? clearAdminModules() : selectAdminModules()
            }
          >
            {allAdminModulesSelected ? "Quitar módulos admin" : "Módulos admin (superadmin)"}
          </button>
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() =>
              allClinicalModulesSelected
                ? clearClinicalModules()
                : selectClinicalModules()
            }
          >
            {allClinicalModulesSelected
              ? "Quitar módulos clínicos"
              : "Módulos clínicos (completo)"}
          </button>
          <button
            type="button"
            className="font-medium text-muted-foreground hover:text-foreground"
            onClick={() => onChange(new Set())}
          >
            Limpiar selección
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section, index) => {
          const isMenuSection =
            section.title.includes("panel admin") ||
            section.title.includes("panel clínico");
          const selectedCount = countSelectedInGroups(
            section.groups,
            selected,
            selectionMode,
          );
          const totalCount = countTotalInGroups(section.groups);

          return (
            <CollapsibleSection
              key={section.title}
              title={section.title}
              selectedCount={selectedCount}
              totalCount={totalCount}
              defaultOpen={index === 0}
            >
              {isMenuSection ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {section.groups.map((group) => (
                    <MenuModuleRow
                      key={group.key}
                      group={group}
                      selected={selected}
                      selectionMode={selectionMode}
                      onToggle={toggle}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {section.groups.map((group) => (
                    <ApiPermissionGroupCard
                      key={group.key}
                      group={group}
                      selected={selected}
                      selectionMode={selectionMode}
                      onToggle={toggle}
                      onToggleGroup={toggleGroup}
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={allSelected}
          onChange={() => onChange(allSelected ? new Set() : new Set(allKeys))}
        />
        Seleccionar todos los permisos ({allKeys.length})
      </label>
    </div>
  );
}
