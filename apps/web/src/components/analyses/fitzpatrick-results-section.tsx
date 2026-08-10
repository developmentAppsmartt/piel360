"use client";

import type { FitzpatrickResult } from "@piel360/shared";
import { ModuleCard } from "@/components/ui/module-card";
import { FITZPATRICK_TYPES } from "@/lib/fitzpatrick-labels";
import type { AnalysisDetail } from "@/lib/queries/analyses";

export function FitzpatrickResultsSection({ analysis }: { analysis: AnalysisDetail }) {
  const result = analysis.aiRawResponse as FitzpatrickResult | null;
  const scale = result?.fitzpatrick_scale;
  const info = scale ? FITZPATRICK_TYPES[scale] : null;

  if (!info || !scale) {
    return (
      <p className="text-muted-foreground">
        No se pudo determinar el fototipo de piel para este análisis.
      </p>
    );
  }

  return (
    <ModuleCard className="space-y-4 p-6 text-center">
      <p className="text-sm text-muted-foreground">Resultado</p>
      <div
        className="mx-auto size-24 rounded-full border-4 border-card shadow"
        style={{ backgroundColor: info.colorHex }}
      />
      <div>
        <p className="text-xl font-bold">Tipo {scale}</p>
        <p className="text-base text-muted-foreground">{info.label}</p>
      </div>
      <p className="text-sm text-muted-foreground">{info.reaction}</p>
    </ModuleCard>
  );
}
