"use client";

import { useMemo } from "react";
import type { Permission } from "@/lib/queries/roles";
import { roleVisibilitySummary } from "@/lib/role-permission-scope";

export function RoleVisibilityPreview({
  roleName,
  permissionsCatalog,
  selectedPermissionIds,
}: {
  roleName: string;
  permissionsCatalog: Permission[];
  selectedPermissionIds: Set<string>;
}) {
  const selectedPermissions = useMemo(
    () => permissionsCatalog.filter((permission) => selectedPermissionIds.has(permission.id)),
    [permissionsCatalog, selectedPermissionIds],
  );

  const summary = useMemo(
    () => roleVisibilitySummary(roleName, selectedPermissions),
    [roleName, selectedPermissions],
  );

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Vista previa de módulos visibles</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Los módulos marcados abajo se aplican al rol{" "}
          <strong className="text-foreground">{roleName}</strong>. Cualquier usuario con este rol
          verá exactamente esas entradas de menú (admin y/o clínico según lo seleccionado).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Menú admin</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {summary.adminNavItems.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.scopeCounts.adminMenu} permisos de módulo admin
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Menú clínico</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {summary.clinicalNavItems.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.scopeCounts.clinicalMenu} permisos de menú clínico
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Solo API</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {summary.scopeCounts.apiOnly}
          </p>
          <p className="text-xs text-muted-foreground">No controlan el sidebar</p>
        </div>
      </div>

      {summary.adminNavItems.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Panel admin (/admin)
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.adminNavItems.map((item) => (
              <li
                key={item.key}
                className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800"
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.clinicalNavItems.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Panel clínico (/doctor)
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.clinicalNavItems.map((item) => (
              <li
                key={item.key}
                className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800"
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.adminNavItems.length === 0 && summary.clinicalNavItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ningún módulo de menú con la selección actual. Solo aplican permisos de API.
        </p>
      ) : null}
    </div>
  );
}
