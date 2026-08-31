"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Trash2, UserCog } from "lucide-react";
import {
  ADMIN_PAGE_SIZES,
  AdminSearchInput,
  AdminTableFooter,
  formatAdminDate,
  UserAvatar,
} from "@/components/admin/admin-directory-ui";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import {
  useDeleteModerator,
  useModerators,
  type Moderator,
} from "@/lib/queries/moderators";

export function ModeratorsManager() {
  const query = useModerators();
  const remove = useDeleteModerator();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof ADMIN_PAGE_SIZES)[number]>(10);

  const filtered = useMemo(() => {
    const rows = query.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.firstName,
        row.lastName,
        row.user.email,
        row.phone,
        row.docNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query.data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, filtered.length);

  function handleDelete(moderator: Moderator) {
    if (
      !confirm(
        `¿Eliminar moderador ${moderator.firstName} ${moderator.lastName}? Se borrará su cuenta.`,
      )
    ) {
      return;
    }
    void remove.mutateAsync(moderator.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Moderadores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuentas con acceso al módulo de verificación de profesionales y empresas.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/moderadores/nuevo" />}>
          <Plus className="size-4" />
          Crear moderador
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total moderadores</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{query.data?.length ?? 0}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Activos en verificación</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
            {query.data?.length ?? 0}
          </p>
        </ModuleCard>
      </div>

      <ModuleCard className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <ModuleCardTitle>Lista de moderadores</ModuleCardTitle>
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, correo o documento…"
          />
        </div>

        {query.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando moderadores…</p>
        ) : query.isError ? (
          <p className="p-5 text-sm text-destructive">No se pudo cargar la lista de moderadores.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 text-left text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Moderador</th>
                    <th className="px-4 py-3 font-semibold">Documento</th>
                    <th className="px-4 py-3 font-semibold">Teléfono</th>
                    <th className="px-4 py-3 font-semibold">Registro</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No hay moderadores registrados.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const fullName = `${row.firstName} ${row.lastName}`.trim();
                      return (
                        <tr key={row.id} className="border-t border-border/80">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={fullName} />
                              <div>
                                <p className="font-medium text-foreground">{fullName}</p>
                                <p className="text-xs text-muted-foreground">{row.user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.docType && row.docNumber
                              ? `${row.docType} ${row.docNumber}`
                              : (row.docNumber ?? "—")}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{row.phone ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatAdminDate(row.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                className="inline-flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50"
                                disabled={remove.isPending}
                                onClick={() => handleDelete(row)}
                                aria-label={`Eliminar ${fullName}`}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
          <UserCog className="size-4" aria-hidden />
        </span>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">¿Qué puede hacer un moderador?</p>
          <p className="mt-1">
            Revisa documentación, aprueba o rechaza cuentas de profesionales y empresas antes de
            que accedan al panel clínico.
          </p>
        </div>
      </ModuleCard>
    </div>
  );
}
