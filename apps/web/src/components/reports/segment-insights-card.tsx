"use client";

import { Lightbulb } from "lucide-react";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";

export interface SegmentInsight {
  text: string;
  tone?: "warning" | "neutral";
}

/**
 * "Hallazgos clave": tarjeta de bullets calculados por cada reporte segmentado
 * (birth-type-report.tsx, pets-report.tsx, physical-activity-report.tsx) —
 * la lógica de qué destacar es específica de cada uno, esta solo presenta.
 */
export function SegmentInsightsCard({ insights }: { insights: SegmentInsight[] }) {
  return (
    <ModuleCard className="p-5">
      <div className="flex items-center gap-2">
        <Lightbulb className="size-4 text-amber-500" aria-hidden />
        <ModuleCardTitle className="text-base">Hallazgos clave</ModuleCardTitle>
      </div>
      {insights.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {insights.map((insight, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  insight.tone === "warning" ? "bg-amber-500" : "bg-primary",
                )}
                aria-hidden
              />
              <span className="text-foreground">{insight.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Sin datos suficientes en el periodo para generar hallazgos.
        </p>
      )}
    </ModuleCard>
  );
}
