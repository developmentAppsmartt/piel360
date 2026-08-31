"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Handshake, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import {
  useAdminCompanies,
  type CompanyRegistrationAdmin,
} from "@/lib/queries/companies";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "empresa" | "empresa_aliada";

const MEMBERSHIP_LABELS: Record<CompanyRegistrationAdmin["membershipType"], string> = {
  empresa: "Membresía empresa",
  empresa_aliada: "Empresa aliada",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function VerificationBadge({ status }: { status: string }) {
  const active = ["active", "approved", "verified"].includes(status);
  const pending = ["pending", "in_review"].includes(status);
  if (active) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Verificado
      </span>
    );
  }
  if (pending) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Pendiente
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
        Rechazado
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground capitalize">
      {status}
    </span>
  );
}

function OrgStatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Activa
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
        Suspendida
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      Pendiente
    </span>
  );
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials}
    </span>
  );
}

export function CompaniesManager() {
  const companies = useAdminCompanies();
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const rows = companies.data ?? [];
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (tab !== "all" && row.membershipType !== tab) return false;
      if (!query) return true;
      const haystack = [
        row.name,
        row.email,
        row.phone,
        row.city,
        row.organization?.name,
        row.organization?.businessEmail,
        row.organization?.referralCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [companies.data, tab, search]);

  const stats = useMemo(() => {
    const rows = companies.data ?? [];
    return {
      total: rows.length,
      empresa: rows.filter((row) => row.membershipType === "empresa").length,
      aliada: rows.filter((row) => row.membershipType === "empresa_aliada").length,
    };
  }, [companies.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Empresas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Usuarios que eligieron <strong>Membresía empresa</strong> o{" "}
          <strong>Empresa aliada</strong> al registrarse en Piel 360.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total registros</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.total}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Membresía empresa</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{stats.empresa}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Empresa aliada</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-600">{stats.aliada}</p>
        </ModuleCard>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 border-b border-border sm:border-0">
          {(
            [
              { id: "all" as const, label: "Todos" },
              { id: "empresa" as const, label: "Membresía empresa", icon: Building2 },
              {
                id: "empresa_aliada" as const,
                label: "Empresa aliada",
                icon: Handshake,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === item.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setTab(item.id)}
            >
              {"icon" in item && item.icon ? <item.icon className="size-4" /> : null}
              {item.label}
            </button>
          ))}
        </div>

        <label className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por nombre, correo u organización…"
            className="h-10 w-full rounded-xl border border-border bg-background pr-3 pl-9 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {companies.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando empresas…</p>
      ) : companies.error ? (
        <p className="text-sm text-destructive">No se pudieron cargar las empresas.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Tipo de registro</th>
                  <th className="px-4 py-3 font-semibold">Organización</th>
                  <th className="px-4 py-3 font-semibold">Ubicación</th>
                  <th className="px-4 py-3 font-semibold">Verificación</th>
                  <th className="px-4 py-3 font-semibold">Equipo</th>
                  <th className="px-4 py-3 font-semibold">Registro</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      No hay registros de empresa en esta categoría.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.doctorId} className="border-t border-border/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <MemberAvatar name={row.name} />
                          <div>
                            <p className="font-medium text-foreground">{row.name}</p>
                            <p className="text-xs text-muted-foreground">{row.email}</p>
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
                            row.membershipType === "empresa_aliada"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {MEMBERSHIP_LABELS[row.membershipType]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.organization ? (
                          <div>
                            <p className="font-medium text-foreground">{row.organization.name}</p>
                            <div className="mt-1">
                              <OrgStatusBadge status={row.organization.status} />
                            </div>
                            {row.organization.referralCode ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Ref: {row.organization.referralCode}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin organización</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[row.city, row.department].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <VerificationBadge status={row.verificationStatus} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.organization
                          ? `${row.organization.seatUsed}/${row.organization.seatLimit}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(row.registeredAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          nativeButton={false}
                          render={<Link href={`/admin/verificacion/${row.doctorId}`} />}
                          variant="outline"
                          size="sm"
                        >
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 ? (
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Mostrando {filtered.length} de {companies.data?.length ?? 0} registros
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
