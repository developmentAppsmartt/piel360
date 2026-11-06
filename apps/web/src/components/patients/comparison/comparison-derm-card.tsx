"use client";

import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ComparisonImage } from "./comparison-pieces";

/** Comparación dermatológica: las dos capturas y el diagnóstico de cada una. */
export function ComparisonDermCard({
  initialPhotoUrl,
  currentPhotoUrl,
  initialDate,
  currentDate,
  initialDiagnosis,
  currentDiagnosis,
  onOpen,
}: {
  initialPhotoUrl: string | null;
  currentPhotoUrl: string | null;
  initialDate?: string;
  currentDate?: string;
  initialDiagnosis: string | null;
  currentDiagnosis: string | null;
  onOpen: () => void;
}) {
  return (
    <ModuleCard className="p-5">
      <ModuleCardTitle className="text-sm">Comparación dermatológica</ModuleCardTitle>
      <p className="mt-1 text-xs text-muted-foreground">
        Comparación visual entre las dos capturas seleccionadas.
      </p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <ComparisonImage label="Inicial" photoUrl={initialPhotoUrl} date={initialDate} onClick={onOpen} />
        <ComparisonImage label="Actual" photoUrl={currentPhotoUrl} date={currentDate} onClick={onOpen} />
      </div>
      {initialDiagnosis || currentDiagnosis ? (
        <div className="mt-6 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Diagnóstico inicial
            </p>
            <p className="mt-1 text-sm">{initialDiagnosis ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Diagnóstico actual
            </p>
            <p className="mt-1 text-sm">{currentDiagnosis ?? "—"}</p>
          </div>
        </div>
      ) : null}
    </ModuleCard>
  );
}
