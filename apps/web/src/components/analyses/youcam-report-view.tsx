"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";
import type { AnalysisDetail } from "@/lib/queries/analyses";
import { YOUCAM_METRIC_LABELS, youcamSkinTypeLabel } from "@/lib/youcam-metric-labels";
import {
  chronologicalAgeYears,
  formatSignedYears,
  skinAgeDifference,
  skinAgeDifferenceMessage,
} from "@/lib/skin-age";
import {
  parseYoucamMetrics,
  YOUCAM_MAIN_METRIC_TYPES,
  youcamOverallScore,
  youcamScoreBand,
  youcamScoreBandLabel,
  youcamScoresByType,
  youcamSkinAge,
  youcamSkinType,
  type YoucamRawResponse,
} from "@/lib/youcam-metrics";
const RADAR_TYPES = [
  "hd_moisture",
  "hd_oiliness",
  "hd_firmness",
  "hd_age_spot",
  "hd_wrinkle",
  "hd_texture",
  "hd_pore",
  "hd_acne",
] as const;

const BAND_COLOR = {
  regular: "#F59E0B",
  promedio: "#3B82F6",
  buena: "#22C55E",
} as const;

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSummary(
  scores: Record<string, number>,
  overall: number | null,
): string {
  const lows = Object.entries(scores)
    .filter(([, v]) => v < 70)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([type]) => YOUCAM_METRIC_LABELS[type] ?? type);

  if (overall != null && overall >= 90) {
    return "Su piel está en buen estado general. Mantén tu rutina de cuidado y protección solar diaria.";
  }
  if (lows.length === 0) {
    return "Su piel está en el promedio. Revisa las zonas detalladas abajo para priorizar tu rutina.";
  }
  return `Prioriza mejorar: ${lows.join(", ")}. Considera hidratación adecuada, protección solar y consulta dermatológica si persisten las molestias.`;
}

function RadarChart({
  scores,
  color,
}: {
  scores: Record<string, number>;
  color: string;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 95;
  const axes = RADAR_TYPES.filter((t) => scores[t] != null);
  if (axes.length < 3) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay suficientes métricas para el radar.
      </p>
    );
  }

  const points = axes.map((type, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    const value = Math.max(0, Math.min(100, scores[type] ?? 0)) / 100;
    return {
      type,
      value: scores[type] ?? 0,
      x: cx + Math.cos(angle) * radius * value,
      y: cy + Math.sin(angle) * radius * value,
      lx: cx + Math.cos(angle) * (radius + 20),
      ly: cy + Math.sin(angle) * (radius + 20),
      ax: cx + Math.cos(angle) * radius,
      ay: cy + Math.sin(angle) * radius,
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-64 w-64">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <circle
          key={ring}
          cx={cx}
          cy={cy}
          r={radius * ring}
          fill="none"
          className="stroke-border"
        />
      ))}
      {points.map((p) => (
        <line
          key={p.type}
          x1={cx}
          y1={cy}
          x2={p.ax}
          y2={p.ay}
          className="stroke-border"
        />
      ))}
      <polygon
        points={polygon}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={2}
      />
      {points.map((p) => (
        <text
          key={`t-${p.type}`}
          x={p.lx}
          y={p.ly}
          textAnchor="middle"
          className="fill-foreground text-[9px] font-bold"
        >
          {Math.round(p.value)}
        </text>
      ))}
    </svg>
  );
}

export function YoucamReportView({
  analysis,
  patientName,
  onBack,
}: {
  analysis: AnalysisDetail;
  patientName?: string;
  onBack: () => void;
}) {
  const metrics = useMemo(
    () =>
      parseYoucamMetrics(analysis.aiRawResponse as YoucamRawResponse | null),
    [analysis.aiRawResponse],
  );
  const [preferRaw, setPreferRaw] = useState(false);
  const scores = useMemo(() => youcamScoresByType(metrics, preferRaw), [metrics, preferRaw]);
  const overall = youcamOverallScore(metrics);
  const skinAge = analysis.skinAgeYears ?? youcamSkinAge(metrics);
  const chronologicalAge =
    analysis.chronologicalAgeYears ??
    chronologicalAgeYears(analysis.patient?.birthDate, analysis.createdAt);
  const ageDiff =
    analysis.skinAgeDifference ??
    skinAgeDifference(skinAge, chronologicalAge);
  const skinType = youcamSkinType(metrics);
  const band = overall != null ? youcamScoreBand(overall) : null;
  const name =
    patientName ??
    (analysis.patient
      ? `${analysis.patient.firstName} ${analysis.patient.lastName}`.trim()
      : "Paciente");

  const gridTypes = useMemo(() => {
    const types = new Set<string>([...YOUCAM_MAIN_METRIC_TYPES]);
    for (const key of Object.keys(scores)) {
      if (
        key !== "all" &&
        key !== "skin_age" &&
        key !== "resize_image" &&
        key !== "hd_skin_type"
      ) {
        types.add(key);
      }
    }
    return [...types].filter((t) => scores[t] != null);
  }, [scores]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold tracking-tight">
            Reporte Salud de la Piel
          </h2>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            title="Descargar (próximamente)"
            onClick={() =>
              window.alert("La descarga del reporte se conectará próximamente.")
            }
          >
            <Download className="size-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            title="PDF (próximamente)"
            onClick={() =>
              window.alert("La exportación a PDF se conectará próximamente.")
            }
          >
            <FileText className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-1 text-xs">
        <button
          type="button"
          onClick={() => setPreferRaw(false)}
          className={cn(
            "rounded-full border px-3 py-1 font-medium",
            !preferRaw
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          Puntuación ajustada
        </button>
        <button
          type="button"
          onClick={() => setPreferRaw(true)}
          className={cn(
            "rounded-full border px-3 py-1 font-medium",
            preferRaw
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          Puntuación real
        </button>
      </div>

      <ModuleCard className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-14 overflow-hidden rounded-full bg-primary/10">
            {analysis.hasOriginalPhoto && analysis.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={analysis.imageUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : null}
          </div>
          <div>
            <p className="font-semibold">Paciente: {name}</p>
            <p className="text-sm text-muted-foreground">
              {formatStamp(analysis.createdAt)}
            </p>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <p>
            Tipo de piel: <span className="font-semibold">{skinType ? youcamSkinTypeLabel(skinType) : "—"}</span>
          </p>
          <p>
            Puntuación de la piel:{" "}
            <span className="font-semibold">
              {overall != null ? Math.round(overall) : "—"}
            </span>
          </p>
          <p>
            Edad de tu piel:{" "}
            <span className="font-semibold">
              {skinAge != null ? `${Math.round(skinAge)} años` : "—"}
            </span>
          </p>
          <p>
            Edad cronológica:{" "}
            <span className="font-semibold text-muted-foreground">
              {chronologicalAge != null ? `${chronologicalAge} años` : "—"}
            </span>
          </p>
          {ageDiff != null ? (
            <>
              <p
                className={cn(
                  "font-semibold",
                  ageDiff < 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ageDiff > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground",
                )}
              >
                Diferencia: {formatSignedYears(ageDiff)}
              </p>
              <p
                className={cn(
                  "font-medium",
                  ageDiff < 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ageDiff > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground",
                )}
              >
                {skinAgeDifferenceMessage(ageDiff)}
              </p>
            </>
          ) : null}
          {band ? (
            <p className="font-semibold text-primary">
              Su piel está en el {youcamScoreBandLabel(band).toLowerCase()}
            </p>
          ) : null}
        </div>

        {overall != null ? (
          <div>
            <div className="flex h-3 overflow-hidden rounded-full">
              <div className="bg-amber-500" style={{ flex: 70 }} />
              <div className="bg-blue-500" style={{ flex: 20 }} />
              <div className="bg-green-500" style={{ flex: 10 }} />
            </div>
            <div className="relative mt-1 h-6">
              <span
                className="absolute top-0 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background"
                style={{ left: `${Math.max(0, Math.min(100, overall))}%` }}
              >
                {Math.round(overall)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs font-semibold">
              <span className="text-amber-600">Regular</span>
              <span className="text-blue-600">Promedio</span>
              <span className="text-green-600">Buena</span>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl bg-muted/50 p-4">
          <p className="text-xs font-bold tracking-wide text-muted-foreground">
            RESUMEN
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            {buildSummary(scores, overall)}
          </p>
        </div>

        <div className="flex justify-center py-2">
          <RadarChart scores={scores} color="var(--primary)" />
        </div>
      </ModuleCard>

      <div className="grid gap-3 sm:grid-cols-2">
        {gridTypes.map((type) => {
          const score = scores[type] ?? 0;
          const itemBand = youcamScoreBand(score);
          const color = BAND_COLOR[itemBand];
          return (
            <ModuleCard key={type} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <ModuleCardTitle className="text-sm">
                  {YOUCAM_METRIC_LABELS[type] ?? type}
                </ModuleCardTitle>
                <span
                  className="text-xs font-bold"
                  style={{ color }}
                >
                  {youcamScoreBandLabel(itemBand)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, score))}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <p className="text-right text-sm font-bold tabular-nums">
                {Math.round(score)}
              </p>
            </ModuleCard>
          );
        })}
      </div>
    </div>
  );
}
