"use client";

import { CalendarDays, FlaskConical, Layers3, Pill, Play, Sparkles } from "lucide-react";
import type { FitzpatrickScale } from "@piel360/shared";
import { FITZPATRICK_SCALES } from "@piel360/shared";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { FITZPATRICK_TYPES } from "@/lib/fitzpatrick-labels";
import { fitzpatrickPriorityLabel } from "@/lib/fitzpatrick-rules-ui";
import type { FitzpatrickSimulationResult } from "@/lib/queries/fitzpatrick-rules";

export function FitzpatrickRuleSimulator({
  fitzpatrickScale,
  onScaleChange,
  onSimulate,
  loading,
  result,
}: {
  fitzpatrickScale: FitzpatrickScale;
  onScaleChange: (scale: FitzpatrickScale) => void;
  onSimulate: () => void;
  loading?: boolean;
  result?: FitzpatrickSimulationResult | null;
}) {
  return (
    <ModuleCard className="sticky top-4 space-y-5 p-5">
      <div>
        <ModuleCardTitle>Simulador de reglas</ModuleCardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Prueba qué regla se aplicaría para un fototipo de ejemplo.
        </p>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Fototipo</span>
        <select
          value={fitzpatrickScale}
          onChange={(event) => onScaleChange(event.target.value as FitzpatrickScale)}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary/50"
        >
          {FITZPATRICK_SCALES.map((scale) => (
            <option key={scale} value={scale}>
              Fototipo {scale} — {FITZPATRICK_TYPES[scale].label}
            </option>
          ))}
        </select>
      </label>

      <Button className="w-full gap-2" onClick={onSimulate} disabled={loading}>
        <Play className="size-4" />
        {loading ? "Simulando…" : "Ejecutar simulación"}
      </Button>

      {result ? (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-semibold">Vista previa del resultado</p>
          {result.matchedRule ? (
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm">
              <p className="font-medium">{result.matchedRule.label}</p>
              <p className="text-xs text-muted-foreground">
                Prioridad: {fitzpatrickPriorityLabel(result.matchedRule.priority)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {result.snapshot.message ?? "Ninguna regla coincide con este fototipo."}
            </p>
          )}

          <PreviewBlock
            icon={Sparkles}
            title="Productos"
            items={result.recommendations.products}
          />
          <PreviewBlock
            icon={CalendarDays}
            title="Rutinas"
            items={result.recommendations.routines.map((item) => ({
              id: item.id,
              name: item.name,
              count: item.stepsCount ?? 0,
            }))}
          />
          <PreviewBlock
            icon={Layers3}
            title="Tratamientos"
            items={result.recommendations.treatments}
          />
          <PreviewBlock icon={Pill} title="Suplementos" items={result.recommendations.supplements} />
        </div>
      ) : null}
    </ModuleCard>
  );
}

function PreviewBlock({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Sparkles;
  title: string;
  items: { id: string; name: string; count?: number; items?: unknown[] }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span>{item.name}</span>
            <span className="text-xs text-muted-foreground">
              {"count" in item && item.count != null
                ? `${item.count} paso${item.count === 1 ? "" : "s"}`
                : `${item.items?.length ?? 0} ítem${(item.items?.length ?? 0) === 1 ? "" : "s"}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
