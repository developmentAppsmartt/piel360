"use client";

import {
  CalendarDays,
  FlaskConical,
  Layers3,
  Pill,
  Play,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import {
  chronologicalAgeYears,
  formatSignedYears,
  skinAgeDifference,
} from "@/lib/skin-age";
import type { SkinAgeSimulationResult } from "@/lib/queries/skin-age-rules";
import { priorityLabel } from "@/lib/skin-age-rules-ui";

export function SkinAgeRuleSimulator({
  birthDate,
  skinAgeYears,
  onBirthDateChange,
  onSkinAgeChange,
  onSimulate,
  loading,
  result,
}: {
  birthDate: string;
  skinAgeYears: number;
  onBirthDateChange: (value: string) => void;
  onSkinAgeChange: (value: number) => void;
  onSimulate: () => void;
  loading?: boolean;
  result?: SkinAgeSimulationResult | null;
}) {
  const chronologicalAge = chronologicalAgeYears(birthDate || null, new Date());
  const difference =
    result?.snapshot.skinAgeDifference ??
    skinAgeDifference(skinAgeYears, chronologicalAge);

  return (
    <ModuleCard className="sticky top-4 space-y-5 p-5">
      <div>
        <ModuleCardTitle>Simulador de reglas</ModuleCardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Prueba cómo se aplicarían las reglas con una fecha de nacimiento y una edad de
          piel de ejemplo.
        </p>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Fecha de nacimiento</span>
        <input
          type="date"
          value={birthDate}
          onChange={(event) => onBirthDateChange(event.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary/50"
        />
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Edad de la piel (resultado IA)</span>
          <span className="font-semibold text-primary">{skinAgeYears} años</span>
        </div>
        <input
          type="range"
          min={18}
          max={80}
          value={skinAgeYears}
          onChange={(event) => onSkinAgeChange(Number(event.target.value))}
          className="w-full accent-primary"
        />
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <p className="text-muted-foreground">Edad cronológica</p>
        <p className="text-lg font-semibold">
          {chronologicalAge != null ? `${chronologicalAge} años` : "—"}
        </p>
        <p className="mt-3 text-muted-foreground">Diferencia calculada</p>
        <p className="text-lg font-semibold text-primary">
          {difference != null ? formatSignedYears(difference) : "—"}
        </p>
        {result?.snapshot.message ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {result.snapshot.message}
          </p>
        ) : null}
      </div>

      <Button className="w-full gap-2" onClick={onSimulate} disabled={loading || !birthDate}>
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
                Prioridad: {priorityLabel(result.matchedRule.priority)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ninguna regla coincide con esta diferencia.
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
          <PreviewBlock
            icon={Pill}
            title="Suplementos"
            items={result.recommendations.supplements}
          />
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
