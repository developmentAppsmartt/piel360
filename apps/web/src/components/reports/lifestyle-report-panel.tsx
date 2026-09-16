"use client";

import {
  ModuleCard,
  ModuleCardDescription,
  ModuleCardTitle,
} from "@/components/ui/module-card";
import type { LifestyleReportSection } from "@/lib/queries/doctor-reports";
import { cn } from "@/lib/utils";

/**
 * Barras horizontales para segmentos lifestyle / clínico IA —
 * mismo lenguaje visual que CategoryRankingBars (track + fill %).
 */
export function LifestyleSegmentBars({
  segments,
  mode,
  barColor = "#1E5A9E",
}: {
  segments: LifestyleReportSection["segments"];
  mode: "score" | "volume";
  barColor?: string;
}) {
  if (segments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sin datos en el periodo. Completa el perfil de pacientes (nacimiento,
        mascotas, actividad) o realiza análisis para ver resultados.
      </p>
    );
  }

  const maxVolume = Math.max(
    1,
    ...segments.map((s) => (mode === "volume" ? s.pct : 100)),
  );

  return (
    <ol className="space-y-1.5">
      {segments.map((segment, index) => {
        const raw =
          mode === "score" ? (segment.avgScore ?? 0) : segment.pct;
        const widthPct =
          mode === "score"
            ? Math.max(0, Math.min(100, raw))
            : Math.max(4, (raw / maxVolume) * 100);
        const valueLabel =
          mode === "score"
            ? segment.avgScore != null
              ? segment.avgScore.toFixed(0)
              : "—"
            : `${segment.pct.toFixed(0)}%`;

        return (
          <li
            key={segment.key}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5"
          >
            <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <span className="w-44 shrink-0 truncate text-sm text-foreground">
              {segment.label}
            </span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: barColor,
                }}
              />
            </span>
            <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
              {valueLabel}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function LifestyleReportPanel({
  section,
  mode,
  description,
}: {
  section: LifestyleReportSection | undefined;
  mode: "score" | "volume";
  description: string;
}) {
  return (
    <ModuleCard className="p-5">
      <ModuleCardTitle className="text-base">
        {section?.title ?? "Reporte"}
      </ModuleCardTitle>
      <ModuleCardDescription className="mt-1">{description}</ModuleCardDescription>
      <div className="mt-4">
        <LifestyleSegmentBars
          segments={section?.segments ?? []}
          mode={mode}
        />
      </div>
      {section && section.segments.length > 0 ? (
        <ul className="mt-4 space-y-1 border-t border-border/60 pt-3">
          {section.segments.map((s) => (
            <li
              key={s.key}
              className={cn("text-xs text-muted-foreground tabular-nums")}
            >
              <span className="font-medium text-foreground">{s.label}</span>
              {": "}
              {s.patients} pacientes ({s.pct.toFixed(0)}%)
              {s.analyses != null ? ` · ${s.analyses} análisis` : ""}
              {s.avgScore != null ? ` · puntaje ${s.avgScore.toFixed(0)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </ModuleCard>
  );
}
