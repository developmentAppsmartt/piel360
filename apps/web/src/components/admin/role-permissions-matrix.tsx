"use client";

import { useMemo } from "react";
import type { Permission } from "@/lib/queries/roles";
import { allPermissionIds, groupPermissions } from "@/lib/permission-catalog";

type SelectionMode = "id" | "name";

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
  const groups = useMemo(() => groupPermissions(permissions), [permissions]);

  const allKeys = useMemo(() => {
    if (selectionMode === "name") {
      return permissions.map((permission) => permission.name);
    }
    return allPermissionIds(permissions);
  }, [permissions, selectionMode]);

  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key));

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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando permisos…</p>;
  }

  if (groups.length === 0) {
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
          Selecciona qué componentes y acciones tendrá este rol. Los componentes controlan qué
          secciones aparecen en el menú; los permisos inactivos no se pueden asignar.
        </p>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onChange(new Set(allKeys))}
          >
            Seleccionar todos
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {groups.map((group) => {
          const groupKeys = group.permissions.map((permission) => keyFor(permission));
          const groupSelected =
            groupKeys.length > 0 && groupKeys.every((key) => selected.has(key));

          return (
            <div
              key={group.key}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <group.icon className="size-4" aria-hidden />
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                  onClick={() => toggleGroup(group.permissions)}
                >
                  {groupSelected ? "Quitar" : "Todos"}
                </button>
              </div>
              <ul className="space-y-2">
                {group.permissions.map((permission) => {
                  const key = keyFor(permission);
                  const inactive = permission.isActive === false;
                  return (
                    <li key={permission.id}>
                      <label
                        className={`flex items-start gap-2 text-sm ${
                          inactive ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 accent-primary"
                          checked={selected.has(key)}
                          disabled={inactive}
                          onChange={() => toggle(key)}
                        />
                        <span>
                          {permission.label}
                          {inactive ? (
                            <span className="ml-1 text-xs text-muted-foreground">(inactivo)</span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
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
