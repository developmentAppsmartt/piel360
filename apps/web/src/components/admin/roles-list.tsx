"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import type { Role } from "@/lib/queries/roles";
import { roleVisibilitySummary } from "@/lib/role-permission-scope";

const PAGE_SIZE = 10;
const PROTECTED_ROLE_NAMES = new Set([
  "superadmin",
  "doctor",
  "patient",
  "monitor",
  "empresa",
]);

function RoleStatusBadge({ active }: { active: boolean }) {
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

function RoleAvatar({ role }: { role: Role }) {
  const color = role.color ?? "#6C4FFB";
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: color }}
    >
      <Shield className="size-4" aria-hidden />
    </span>
  );
}

export function RolesList({
  roles,
  onDelete,
}: {
  roles: Role[];
  onDelete: (role: Role) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((role) => {
      const label = (role.label ?? role.name).toLowerCase();
      const specialties = role.specialtyLinks
        .map((link) => link.doctorSpecialty.name.toLowerCase())
        .join(" ");
      const labor = role.laborTechnicianProfile?.name.toLowerCase() ?? "";
      return (
        label.includes(q) ||
        role.name.toLowerCase().includes(q) ||
        specialties.includes(q) ||
        labor.includes(q)
      );
    });
  }, [roles, search]);

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
    <ModuleCard>
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <ModuleCardTitle>Lista de roles</ModuleCardTitle>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar rol…"
            className="h-10 w-full rounded-xl border border-border bg-background pr-10 pl-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {rows.length > 0 ? (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Asociación</th>
                  <th className="px-4 py-3 font-semibold">Permisos</th>
                  <th className="px-4 py-3 font-semibold">Menú efectivo</th>
                  <th className="px-4 py-3 font-semibold">Usuarios</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((role) => {
                  const isProtected = PROTECTED_ROLE_NAMES.has(role.name);
                  const association =
                    role.specialtyLinks.length > 0
                      ? role.specialtyLinks
                          .map((link) => link.doctorSpecialty.name)
                          .join(", ")
                      : role.laborTechnicianProfile?.name ?? "—";
                  const visibility = roleVisibilitySummary(role.name, role.permissions);
                  const effectiveMenuCount =
                    visibility.adminNavItems.length + visibility.clinicalNavItems.length;
                  const panelLabels: string[] = [];
                  if (visibility.adminNavItems.length > 0) panelLabels.push("admin");
                  if (visibility.clinicalNavItems.length > 0) panelLabels.push("clínico");

                  return (
                    <tr key={role.id} className="border-t border-border/80 align-top">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <RoleAvatar role={role} />
                          <div>
                            <p className="font-semibold text-foreground">
                              {role.label ?? role.name}
                            </p>
                            {role.label && role.label !== role.name ? (
                              <p className="text-xs text-muted-foreground">{role.name}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-4 text-muted-foreground">
                        {association}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                            {role.permissions.length} total
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {visibility.scopeCounts.adminMenu} admin ·{" "}
                            {visibility.scopeCounts.clinicalMenu} clínico ·{" "}
                            {visibility.scopeCounts.apiOnly} API
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {effectiveMenuCount} módulos
                        </span>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {panelLabels.length > 0
                            ? `Panel ${panelLabels.join(" + ")}`
                            : "Solo API"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {role._count.users}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <RoleStatusBadge active={role.isActive} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            nativeButton={false}
                            render={<Link href={`/admin/roles/${role.id}/editar`} />}
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            disabled={isProtected}
                            title={
                              isProtected
                                ? "Este rol del sistema no se puede eliminar"
                                : undefined
                            }
                            onClick={() => onDelete(role)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? "Sin resultados"
                : `Mostrando ${showingFrom}${showingTo > showingFrom ? `–${showingTo}` : ""} de ${total} rol${total === 1 ? "" : "es"}`}
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
      ) : (
        <p className="py-8 text-sm text-muted-foreground">
          {search.trim() ? "No hay roles que coincidan con la búsqueda." : "Sin roles."}
        </p>
      )}
    </ModuleCard>
  );
}
