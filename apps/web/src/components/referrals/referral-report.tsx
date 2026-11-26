"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import { colombiaDateKey } from "@piel360/shared";
import { apiClientFetch } from "@/lib/api-client";
import { downloadCsv } from "@/lib/csv-export";
import {
  EMPTY_FILTERS,
  hasFilters,
  matchesReferral,
  referralCsvRows,
  specialtyOptions,
  type ReferralFilters,
  type ReferralReportRow,
} from "./referral-report-filters";
import { ReferralReportFilterBar } from "./referral-report-filter-bar";
import { ReferralReportTable } from "./referral-report-table";

/** Reporte de referidos (admin y empresa aliada): filtros, tabla y
 * exportación. `withOrganization` agrega la columna y el filtro de empresa. */
export function ReferralReport({
  endpoint,
  withOrganization = false,
}: {
  endpoint: string;
  withOrganization?: boolean;
}) {
  const query = useQuery({
    queryKey: ["referral-report", endpoint],
    queryFn: () => apiClientFetch<ReferralReportRow[]>(endpoint),
  });
  const [draft, setDraft] = useState<ReferralFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<ReferralFilters>(EMPTY_FILTERS);

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const visible = useMemo(() => rows.filter((r) => matchesReferral(r, applied)), [rows, applied]);
  const specialties = useMemo(() => specialtyOptions(rows), [rows]);

  function exportCsv() {
    downloadCsv(
      `referidos-${colombiaDateKey(new Date())}.csv`,
      referralCsvRows(visible, withOrganization),
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileSpreadsheet className="size-4" aria-hidden />
            Exportar a Excel
          </button>
        </div>
        <ReferralReportFilterBar
          draft={draft}
          onDraftChange={setDraft}
          onApply={() => setApplied(draft)}
          onClear={() => {
            setDraft(EMPTY_FILTERS);
            setApplied(EMPTY_FILTERS);
          }}
          specialties={specialties}
          withOrganization={withOrganization}
        />
      </section>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando referidos…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los referidos.</p>
      ) : (
        <ReferralReportTable
          rows={visible}
          withOrganization={withOrganization}
          emptyMessage={
            hasFilters(applied) && rows.length > 0
              ? "No hay referidos con esos filtros."
              : "Aún no hay referidos registrados."
          }
        />
      )}
    </div>
  );
}
