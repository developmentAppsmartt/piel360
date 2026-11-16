"use client";

import { useState } from "react";
import { LEAD_STATUSES, leadIntentLabel, leadInterestLabel } from "@piel360/shared";
import { ModuleCard, ModuleCardDescription, ModuleCardTitle } from "@/components/ui/module-card";
import { useAdminLeads, type LeadFilters } from "@/lib/queries/admin-leads";
import { LeadRowActions } from "./lead-row-actions";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const selectClass = "h-10 rounded-lg border border-border bg-background px-3 text-sm";

/** Contactos del formulario de la landing pública. */
export function LeadsManager() {
  const [filters, setFilters] = useState<LeadFilters>({ status: "all", q: "", page: 1 });
  const { data, isLoading, error } = useAdminLeads(filters);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads de la landing</h1>
        <p className="text-sm text-muted-foreground">
          Contactos que llegan por el formulario de la página pública.
        </p>
      </div>

      <ModuleCard className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">
            Estado
            <select
              className={`${selectClass} mt-1 block`}
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value as LeadFilters["status"], page: 1 })
              }
            >
              <option value="all">Todos</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-56 flex-1 text-sm font-medium">
            Buscar
            <input
              type="search"
              placeholder="Nombre, negocio, correo o teléfono"
              className={`${selectClass} mt-1 block w-full`}
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
            />
          </label>
        </div>

        <div>
          <ModuleCardTitle>{data ? `${data.total} leads` : "Leads"}</ModuleCardTitle>
          <ModuleCardDescription>Del más reciente al más antiguo.</ModuleCardDescription>
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
        {error ? <p className="text-sm text-destructive">No se pudieron cargar los leads.</p> : null}
        {data && data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay leads con estos filtros.</p>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Contacto</th>
                  <th className="py-2 pr-3 font-medium">Interés</th>
                  <th className="py-2 pr-3 font-medium">Campaña</th>
                  <th className="py-2 font-medium">Seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((lead) => (
                  <tr key={lead.id} className="border-b align-top last:border-0">
                    <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground">{formatDate(lead.createdAt)}</td>
                    <td className="py-3 pr-3">
                      <p className="font-semibold">{lead.name}</p>
                      <p className="text-muted-foreground">{lead.business}</p>
                      <a className="block text-primary hover:underline" href={`mailto:${lead.email}`}>
                        {lead.email}
                      </a>
                      <a className="block text-primary hover:underline" href={`tel:${lead.phone}`}>
                        {lead.phone}
                      </a>
                    </td>
                    <td className="py-3 pr-3">
                      <p>{leadInterestLabel(lead.interest)}</p>
                      <p className="text-muted-foreground">{leadIntentLabel(lead.intent)}</p>
                      {lead.planName ? <p className="text-muted-foreground">Plan: {lead.planName}</p> : null}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="py-3">
                      <LeadRowActions lead={lead} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {pages > 1 ? (
          <div className="flex items-center justify-end gap-2 text-sm">
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 disabled:opacity-50"
              disabled={filters.page <= 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              Anterior
            </button>
            <span>
              Página {filters.page} de {pages}
            </span>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 disabled:opacity-50"
              disabled={filters.page >= pages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </ModuleCard>
    </div>
  );
}
