"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_PAGE_SIZES = [10, 25, 50] as const;

export function formatAdminDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-background pr-3 pl-9 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export function AdminTableFooter({
  showingFrom,
  showingTo,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  showingFrom: number;
  showingTo: number;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: (typeof ADMIN_PAGE_SIZES)[number]) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <p>
        Mostrando {showingFrom} a {showingTo} de {total} registros
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-xs">Mostrar</span>
          <select
            className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as (typeof ADMIN_PAGE_SIZES)[number])
            }
          >
            {ADMIN_PAGE_SIZES.map((size) => (
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
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
            {page}
          </span>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            aria-label="Página siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function VerificationStatusBadge({ status }: { status: string }) {
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

export function RoleBadge({ name }: { name: string }) {
  const styles: Record<string, string> = {
    superadmin: "bg-primary/10 text-primary",
    monitor: "bg-sky-50 text-sky-700",
    empresa: "bg-cyan-50 text-cyan-800",
    doctor: "bg-primary/10 text-primary",
    patient: "bg-emerald-50 text-emerald-700",
    dermatologo: "bg-primary/10 text-primary",
    tecnico_cosmetica: "bg-indigo-50 text-indigo-700",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        styles[name] ?? "bg-muted text-muted-foreground",
      )}
    >
      {name}
    </span>
  );
}
