import { ModuleCard } from "@/components/ui/module-card";
import { analisisPiel360SkinTypeLabel } from "@/lib/youcam-metric-labels";
import { formatSignedYears, skinAgeDifferenceMessage } from "@/lib/skin-age";
import { cn } from "@/lib/utils";

/** Resumen de arriba: edad de la piel, puntaje general, biotipo y fototipo. */
export function AnalisisPiel360Summary({
  skinAge,
  chronologicalAge,
  overall,
  ageDiff,
  skinType,
  fitzpatrickDetail,
}: {
  skinAge: number | null;
  chronologicalAge: number | null;
  overall: number | null;
  ageDiff: number | null;
  skinType: string | null;
  fitzpatrickDetail: string | null;
}) {
  const scorePct =
    overall != null ? Math.max(0, Math.min(100, overall)) : 0;
  const diffClass =
    ageDiff == null
      ? "text-muted-foreground"
      : ageDiff < 0
        ? "text-emerald-600 dark:text-emerald-400"
        : ageDiff > 0
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground";

  return (
      <ModuleCard className="space-y-2 bg-sky-50/80 p-4 dark:bg-sky-950/20">
        <p className="text-sm">
          Salud de la piel (años):{" "}
          <span className="font-semibold text-primary">
            {skinAge != null ? `${Math.round(skinAge)} años` : "—"}
          </span>
          <span className="font-semibold text-muted-foreground">
            {" "}
            (Edad cronológica):{" "}
            {chronologicalAge != null ? `${chronologicalAge} años` : "—"}
          </span>
        </p>
        <p className="text-sm">
          Puntaje de la piel:{" "}
          <span className="font-semibold text-muted-foreground">
            {overall != null ? `${Math.round(overall)} / 100` : "—"}
          </span>
        </p>
        {overall != null ? (
          <div className="space-y-1">
            <div className="relative h-4">
              {scorePct < 96 ? (
                <span
                  className="absolute top-0 -translate-x-1/2 text-[11px] font-bold text-primary"
                  style={{ left: `${scorePct}%` }}
                >
                  {Math.round(overall)}
                </span>
              ) : null}
              <span className="absolute top-0 right-0 text-[11px] font-bold text-muted-foreground">
                100
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>
        ) : null}
        {ageDiff != null ? (
          <>
            <p className={cn("text-sm font-semibold", diffClass)}>
              Diferencia: {formatSignedYears(ageDiff)}
            </p>
            <p className={cn("text-sm font-medium", diffClass)}>
              {skinAgeDifferenceMessage(ageDiff)}
            </p>
          </>
        ) : null}
        <p className="text-sm">
          Biotipo:{" "}
          <span className="font-semibold text-muted-foreground">
            {skinType ? analisisPiel360SkinTypeLabel(skinType) : "—"}
          </span>
        </p>
        {fitzpatrickDetail ? (
          <p className="text-sm">
            Fototipo:{" "}
            <span className="font-semibold text-muted-foreground">
              {fitzpatrickDetail}
            </span>
          </p>
        ) : null}
      </ModuleCard>
  );
}
