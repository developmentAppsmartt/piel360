"use client";

import type { LucideIcon } from "lucide-react";
import { Building2, Layers, RotateCcw, Search, Stethoscope, Users } from "lucide-react";
import type { ReferralFilters } from "./referral-report-filters";

const fieldClass =
  "h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const dateClass =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <span className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        {children}
      </span>
    </label>
  );
}

/** Los filtros de la maqueta. Editan un borrador: se aplica con Consultar. */
export function ReferralReportFilterBar({
  draft,
  onDraftChange,
  onApply,
  onClear,
  specialties,
  withOrganization,
}: {
  draft: ReferralFilters;
  onDraftChange: (next: ReferralFilters) => void;
  onApply: () => void;
  onClear: () => void;
  specialties: string[];
  withOrganization: boolean;
}) {
  const set = (key: keyof ReferralFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onDraftChange({ ...draft, [key]: e.target.value });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
    >
      <div className={withOrganization ? "grid gap-4 md:grid-cols-3" : "grid gap-4 md:grid-cols-2"}>
        {withOrganization ? (
          <Field label="Buscar por nombre de empresa aliada" icon={Building2}>
            <input className={fieldClass} placeholder="Nombre de empresa…" value={draft.organization} onChange={set("organization")} />
          </Field>
        ) : null}
        <Field label="Buscar por profesional" icon={Users}>
          <input className={fieldClass} placeholder="Nombre del profesional…" value={draft.professional} onChange={set("professional")} />
        </Field>
        <Field label="Buscar por nombre de plan" icon={Layers}>
          <input className={fieldClass} placeholder="Nombre del plan…" value={draft.plan} onChange={set("plan")} />
        </Field>
      </div>

      {/* Las fechas usan el calendario del navegador, que ya trae su ícono. */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex w-44 flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Fecha específica</span>
          <input type="date" aria-label="Fecha específica" className={dateClass} value={draft.day} onChange={set("day")} />
        </label>
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">O entre un periodo</span>
          <div className="flex items-center gap-2">
            <input type="date" aria-label="Desde" className={`${dateClass} w-40`} value={draft.from} max={draft.to || undefined} onChange={set("from")} />
            <span className="text-sm font-medium text-muted-foreground">a</span>
            <input type="date" aria-label="Hasta" className={`${dateClass} w-40`} value={draft.to} min={draft.from || undefined} onChange={set("to")} />
          </div>
        </div>
        <div className="min-w-56 flex-1">
          <Field label="Especialidad" icon={Stethoscope}>
            <select className={fieldClass} value={draft.specialty} onChange={set("specialty")}>
              <option value="">Todas las especialidades</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-primary/40 px-4 text-sm font-semibold text-primary transition hover:bg-primary/5"
          >
            <RotateCcw className="size-4" aria-hidden />
            Limpiar
          </button>
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Search className="size-4" aria-hidden />
            Consultar
          </button>
        </div>
      </div>
    </form>
  );
}
