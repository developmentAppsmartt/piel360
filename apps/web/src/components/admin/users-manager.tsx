"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import {
  ADMIN_PAGE_SIZES,
  AdminSearchInput,
  AdminTableFooter,
  formatAdminDate,
  RoleBadge,
  UserAvatar,
} from "@/components/admin/admin-directory-ui";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { useUsers, type AdminUser } from "@/lib/queries/users";
import {
  buildProfessionalSegments,
  matchesProfessionalTab,
  professionalAndEmpresaTotal,
  professionalSegmentForUser,
} from "@/lib/admin-user-stats";
import { resolveUserAccountKind, USER_ACCOUNT_KIND_LABELS } from "@/lib/user-account-kind";
import { cn } from "@/lib/utils";

type RoleFilter = "all" | "superadmin" | "monitor" | "profesionales" | "patient";

const ROLE_TABS: { id: RoleFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "superadmin", label: "Superadmin" },
  { id: "monitor", label: "Moderador" },
  { id: "profesionales", label: "Profesionales" },
  { id: "patient", label: "Paciente" },
];

function userMatchesTab(user: AdminUser, tab: RoleFilter) {
  if (tab === "all") return true;
  if (tab === "profesionales") return matchesProfessionalTab(user);
  return user.roles.some((r) => r.name === tab);
}

export function UsersManager() {
  const users = useUsers();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof ADMIN_PAGE_SIZES)[number]>(10);

  const stats = useMemo(() => {
    const rows = users.data ?? [];
    const professionalSegments = buildProfessionalSegments(rows);
    return {
      total: rows.length,
      professionalSegments,
      clinicalTotal: professionalAndEmpresaTotal(rows),
      patients: rows.filter((u) => u.roles.some((r) => r.name === "patient")).length,
      admins: rows.filter((u) => u.roles.some((r) => r.name === "superadmin")).length,
    };
  }, [users.data]);

  const filtered = useMemo(() => {
    const rows = users.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!userMatchesTab(row, tab)) return false;
      if (!q) return true;
      const roles = row.roles.map((r) => r.name).join(" ");
      return `${row.name} ${row.email} ${roles}`.toLowerCase().includes(q);
    });
  }, [users.data, search, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, filtered.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas las cuentas registradas en la plataforma y sus roles asignados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total usuarios</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.total}</p>
        </ModuleCard>
        <ModuleCard className="p-4 sm:col-span-2">
          <p className="text-xs font-medium text-muted-foreground">
            Profesionales y empresas
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
            {stats.clinicalTotal}
          </p>
          {stats.professionalSegments.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
              {stats.professionalSegments.map((segment) => (
                <li
                  key={segment.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-muted-foreground">{segment.label}</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {segment.count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Sin cuentas clínicas registradas.
            </p>
          )}
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Pacientes</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">{stats.patients}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Superadmins</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-violet-600">{stats.admins}</p>
        </ModuleCard>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setTab(item.id);
              setPage(1);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ModuleCard className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <ModuleCardTitle>Lista de usuarios</ModuleCardTitle>
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, correo o rol…"
          />
        </div>

        {users.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando usuarios…</p>
        ) : users.error ? (
          <p className="p-5 text-sm text-destructive">No se pudo cargar la lista de usuarios.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 text-left text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Roles</th>
                    <th className="px-4 py-3 font-semibold">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                        No hay usuarios en esta categoría.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t border-border/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={row.name} />
                            <div>
                              <p className="font-medium text-foreground">{row.name}</p>
                              <p className="text-xs text-muted-foreground">{row.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {row.roles.length === 0 ? (
                              (() => {
                                const segment = professionalSegmentForUser(row);
                                if (segment) {
                                  return (
                                    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                      {segment.label}
                                    </span>
                                  );
                                }
                                const kind = resolveUserAccountKind(row);
                                if (kind !== "paciente" || row.patient) {
                                  return (
                                    <span className="text-xs text-muted-foreground">
                                      {USER_ACCOUNT_KIND_LABELS[kind]}
                                    </span>
                                  );
                                }
                                return <span className="text-muted-foreground">—</span>;
                              })()
                            ) : (
                              row.roles.map((role) => (
                                <RoleBadge key={role.name} name={role.name} />
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatAdminDate(row.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 ? (
              <AdminTableFooter
                showingFrom={showingFrom}
                showingTo={showingTo}
                total={filtered.length}
                page={currentPage}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            ) : null}
          </>
        )}
      </ModuleCard>

      <ModuleCard className="flex items-start gap-3 bg-muted/20 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="size-4" aria-hidden />
        </span>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Gestión de accesos</p>
          <p className="mt-1">
            Los roles definen qué módulos puede ver cada cuenta. Para permisos clínicos
            detallados, usa Roles y permisos o el módulo de verificación.
          </p>
        </div>
      </ModuleCard>
    </div>
  );
}
