"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, ChevronRight, Stethoscope, UserRound } from "lucide-react";
import {
  ADMIN_PAGE_SIZES,
  AdminSearchInput,
  AdminTableFooter,
  formatAdminDate,
  UserAvatar,
  VerificationStatusBadge,
} from "@/components/admin/admin-directory-ui";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import {
  accountTypeLabel,
  isEnterpriseDoctor,
  useDoctors,
  type Doctor,
} from "@/lib/queries/doctors";
import { cn } from "@/lib/utils";

type AccountFilter = "all" | "professional" | "enterprise" | "enterprise_ally";

const ACCOUNT_TABS: { id: AccountFilter; label: string; icon?: typeof Stethoscope }[] = [
  { id: "all", label: "Todos" },
  { id: "professional", label: "Profesional", icon: Stethoscope },
  { id: "enterprise", label: "Membresía empresa", icon: Building2 },
  { id: "enterprise_ally", label: "Empresa aliada", icon: Building2 },
];

function matchesAccountFilter(doctor: Doctor, filter: AccountFilter) {
  if (filter === "all") return true;
  if (filter === "professional") return !isEnterpriseDoctor(doctor);
  const type = (doctor.membershipType ?? "").trim().toLowerCase();
  if (filter === "enterprise_ally") {
    return type === "empresa_aliada" || Boolean(doctor.empresaReferida);
  }
  return (
    (type === "empresa" || Boolean(doctor.empresa)) && !doctor.empresaReferida && type !== "empresa_aliada"
  );
}

export function DoctorsManager() {
  const doctors = useDoctors();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<AccountFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof ADMIN_PAGE_SIZES)[number]>(10);

  const stats = useMemo(() => {
    const rows = doctors.data ?? [];
    return {
      total: rows.length,
      verified: rows.filter((d) =>
        ["active", "approved", "verified"].includes(d.verificationStatus),
      ).length,
      pending: rows.filter((d) => ["pending", "in_review"].includes(d.verificationStatus))
        .length,
      enterprise: rows.filter((d) => isEnterpriseDoctor(d)).length,
    };
  }, [doctors.data]);

  const filtered = useMemo(() => {
    const rows = doctors.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesAccountFilter(row, tab)) return false;
      if (!q) return true;
      const haystack = [
        row.firstName,
        row.lastName,
        row.user.email,
        row.specialty,
        row.city,
        row.phone,
        accountTypeLabel(row),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [doctors.data, search, tab]);

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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profesionales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profesionales registrados en Piel 360: individuales, empresas y empresas aliadas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total profesionales</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.total}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Verificados</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">{stats.verified}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Pendientes</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">{stats.pending}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Cuentas empresa</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{stats.enterprise}</p>
        </ModuleCard>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACCOUNT_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setTab(item.id);
              setPage(1);
            }}
          >
            {item.icon ? <item.icon className="size-3.5" /> : null}
            {item.label}
          </button>
        ))}
      </div>

      <ModuleCard className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <ModuleCardTitle>Lista de profesionales</ModuleCardTitle>
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, correo o especialidad…"
          />
        </div>

        {doctors.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando profesionales…</p>
        ) : doctors.error ? (
          <p className="p-5 text-sm text-destructive">No se pudo cargar la lista de profesionales.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 text-left text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Profesional</th>
                    <th className="px-4 py-3 font-semibold">Tipo de cuenta</th>
                    <th className="px-4 py-3 font-semibold">Especialidad</th>
                    <th className="px-4 py-3 font-semibold">Ubicación</th>
                    <th className="px-4 py-3 font-semibold">Verificación</th>
                    <th className="px-4 py-3 font-semibold">Registro</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                        No hay profesionales en esta categoría.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const fullName = `${row.firstName} ${row.lastName}`.trim();
                      const accountType = accountTypeLabel(row);
                      return (
                        <tr key={row.id} className="border-t border-border/80">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={fullName} />
                              <div>
                                <p className="font-medium text-foreground">{fullName}</p>
                                <p className="text-xs text-muted-foreground">{row.user.email}</p>
                                {row.phone ? (
                                  <p className="text-xs text-muted-foreground">{row.phone}</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                isEnterpriseDoctor(row)
                                  ? row.empresaReferida ||
                                    row.membershipType === "empresa_aliada"
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {accountType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.specialty ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {[row.city, row.department].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <VerificationStatusBadge status={row.verificationStatus} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatAdminDate(row.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                nativeButton={false}
                                render={<Link href={`/admin/doctores/${row.id}`} />}
                                variant="outline"
                                size="sm"
                              >
                                Perfil
                              </Button>
                              <Button
                                nativeButton={false}
                                render={<Link href={`/admin/verificacion/${row.id}`} />}
                                variant="ghost"
                                size="sm"
                              >
                                Verificar
                                <ChevronRight className="size-4" />
                              </Button>
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
          <UserRound className="size-4" aria-hidden />
        </span>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Verificación y perfiles</p>
          <p className="mt-1">
            Desde aquí puedes abrir el perfil administrativo o ir directo al flujo de
            verificación documental del profesional.
          </p>
        </div>
      </ModuleCard>
    </div>
  );
}
