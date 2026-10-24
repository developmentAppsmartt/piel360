"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatLastAccess,
  MemberAvatar,
  MemberStatusBadge,
  type OrgMember,
} from "./team-member-display";
import { inferMemberRoleLabel } from "./team-member-utils";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/** Tabla paginada de los miembros del equipo (sin el propietario). */
export function TeamMembersTable({
  members,
  isOwner,
  laborProfileSet,
  editingId,
  removing,
  onEdit,
  onRemove,
}: {
  members: OrgMember[];
  isOwner: boolean;
  laborProfileSet: Set<string>;
  editingId: string | null;
  removing: boolean;
  onEdit: (member: OrgMember) => void;
  onRemove: (member: OrgMember) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const totalPages = Math.max(1, Math.ceil(members.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = members.slice(start, start + pageSize);
  const rangeStart = members.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(currentPage * pageSize, members.length);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-200 text-left text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Especialidad / Área</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Último acceso</th>
              {isOwner ? (
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={isOwner ? 6 : 5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No hay miembros en esta categoría.
                </td>
              </tr>
            ) : (
              rows.map((member) => (
                <tr
                  key={member.id}
                  className={cn(
                    "border-t border-border/80 transition-colors",
                    editingId === member.id && "bg-primary/5",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MemberAvatar name={member.name} />
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">
                    {inferMemberRoleLabel(member.specialty, laborProfileSet)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {member.specialty ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <MemberStatusBadge status={member.verificationStatus} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatLastAccess(member.lastAccessAt)}
                  </td>
                  {isOwner ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                          onClick={() => onEdit(member)}
                          aria-label={`Editar ${member.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50"
                          disabled={removing}
                          onClick={() => onRemove(member)}
                          aria-label={`Eliminar ${member.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {members.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <p>
            Mostrando {rangeStart} a {rangeEnd} de {members.length} registros
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-xs">Mostrar</span>
              <select
                className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-xs">registros</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                {currentPage}
              </span>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Página siguiente"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
