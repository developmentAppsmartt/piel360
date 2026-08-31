"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileSearch,
  XCircle,
} from "lucide-react";
import { AnalysesTable } from "@/components/analyses/analyses-table";
import { ModuleCard } from "@/components/ui/module-card";
import { useAnalyses } from "@/lib/queries/analyses";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "pending" | "confirmed" | "invalid";

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone: "primary" | "amber" | "emerald" | "rose";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <ModuleCard className="flex items-center gap-4 p-4">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          tones[tone],
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </ModuleCard>
  );
}

export function DoctorAnalysesHub() {
  const analyses = useAnalyses();
  const [filter, setFilter] = useState<FilterTab>("all");

  const stats = useMemo(() => {
    const rows = analyses.data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((a) => a.isValid && !a.isConfirmed).length,
      confirmed: rows.filter((a) => a.isConfirmed).length,
      invalid: rows.filter((a) => !a.isValid).length,
    };
  }, [analyses.data]);

  const filtered = useMemo(() => {
    const rows = analyses.data ?? [];
    if (filter === "pending") return rows.filter((a) => a.isValid && !a.isConfirmed);
    if (filter === "confirmed") return rows.filter((a) => a.isConfirmed);
    if (filter === "invalid") return rows.filter((a) => !a.isValid);
    return rows;
  }, [analyses.data, filter]);

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "pending", label: "Pendientes" },
    { id: "confirmed", label: "Confirmados" },
    { id: "invalid", label: "Inválidos" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Análisis y resultados
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Historial global de análisis IA realizados a tus pacientes. Revisa diagnósticos,
          confirma resultados y accede al detalle de cada estudio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total análisis" value={stats.total} icon={ClipboardList} tone="primary" />
        <StatCard label="Pendientes de confirmar" value={stats.pending} icon={Clock3} tone="amber" />
        <StatCard label="Confirmados" value={stats.confirmed} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Inválidos" value={stats.invalid} icon={XCircle} tone="rose" />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              filter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
            <p className="text-sm text-muted-foreground">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="p-5 pt-0">
            <AnalysesTable analyses={filtered} variant="modern" />
          </div>
        </ModuleCard>
      )}

      {stats.pending > 0 ? (
        <ModuleCard className="border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
          Tienes <strong>{stats.pending}</strong> análisis pendientes de confirmación. Abre cada
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
