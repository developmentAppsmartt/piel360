"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Clock3, FileSearch, XCircle } from "lucide-react";
import { AnalysesTable } from "@/components/analyses/analyses-table";
import { ModuleCard } from "@/components/ui/module-card";
import { PageBanner } from "@/components/ui/page-banner";
import { StatTile } from "@/components/ui/stat-tile";
import { useAnalyses, type AnalysisListItem } from "@/lib/queries/analyses";
import { usePatients } from "@/lib/queries/patients";
import {
  AnalysesHubFilters,
  matchesKind,
  matchesStatus,
  type KindFilter,
  type StatusFilter,
} from "./analyses-hub/analyses-hub-filters";

function isThisMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/** Total y cuántos de este mes, por estado. */
function countStats(rows: AnalysisListItem[]) {
  const now = new Date();
  const stat = (status: StatusFilter) => {
    const matching = rows.filter((a) => matchesStatus(a, status));
    return {
      total: matching.length,
      month: matching.filter((a) => isThisMonth(a.createdAt, now)).length,
    };
  };
  return {
    all: stat("all"),
    pending: stat("pending"),
    confirmed: stat("confirmed"),
    invalid: stat("invalid"),
  };
}

function monthFooter(n: number) {
  return n > 0 ? `+${n} este mes` : "Sin nuevos este mes";
}

export function DoctorAnalysesHub() {
  const analyses = useAnalyses();
  const patients = usePatients();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");

  const stats = useMemo(() => countStats(analyses.data ?? []), [analyses.data]);
  const filtered = useMemo(
    () => (analyses.data ?? []).filter((a) => matchesStatus(a, status) && matchesKind(a, kind)),
    [analyses.data, status, kind],
  );

  // La foto ya viene en la lista de pacientes: se cruza aquí y no se toca el
  // endpoint de análisis.
  const avatars = useMemo(
    () => new Map((patients.data ?? []).map((p) => [p.id, p.avatarThumbUrl ?? null])),
    [patients.data],
  );
  const avatarFor = useCallback((patientId: string) => avatars.get(patientId) ?? null, [avatars]);

  return (
    <div className="space-y-6">
      <PageBanner
        icon={ClipboardList}
        image
        title="Análisis y resultados"
        subtitle="Historial global de análisis IA realizados a tus pacientes. Revisa diagnósticos, confirma resultados y accede al detalle de cada estudio."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          icon={ClipboardList}
          tone="blue"
          label="Total análisis"
          value={stats.all.total}
          footer={monthFooter(stats.all.month)}
        />
        <StatTile
          icon={Clock3}
          tone="orange"
          label="Pendientes de confirmar"
          value={stats.pending.total}
          footer={monthFooter(stats.pending.month)}
        />
        <StatTile
          icon={CheckCircle2}
          tone="emerald"
          label="Confirmados"
          value={stats.confirmed.total}
          footer={monthFooter(stats.confirmed.month)}
        />
        <StatTile
          icon={XCircle}
          tone="pink"
          label="Inválidos"
          value={stats.invalid.total}
          footer={monthFooter(stats.invalid.month)}
        />
      </div>

      <AnalysesHubFilters status={status} onStatus={setStatus} kind={kind} onKind={setKind} />

      {analyses.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando análisis…</p>
      ) : analyses.error ? (
        <p className="text-sm text-destructive">No se pudo cargar el historial.</p>
      ) : (
        <ModuleCard className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <FileSearch className="size-4 text-primary" aria-hidden />
              <h2 className="text-base font-semibold text-foreground">Historial de análisis</h2>
            </div>
          </div>
          <div className="p-5 pt-0">
            <AnalysesTable analyses={filtered} variant="modern" avatarFor={avatarFor} showActions />
          </div>
        </ModuleCard>
      )}

      {stats.pending.total > 0 ? (
        <ModuleCard className="border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
          Tienes <strong>{stats.pending.total}</strong> análisis pendientes de confirmación. Abre cada
          registro para validar o corregir el diagnóstico antes de compartirlo con el paciente.
        </ModuleCard>
      ) : null}

      <p className="text-sm text-muted-foreground">
        ¿Buscas el consumo de créditos?{" "}
        <Link href="/doctor/consumo" className="font-medium text-primary hover:underline">
          Ver consumo de análisis
        </Link>
      </p>
    </div>
  );
}
