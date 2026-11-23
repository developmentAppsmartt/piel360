import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreMini } from "./comparison-pieces";

export type ComparisonScores = {
  initial: number;
  current: number;
  improvement: number;
  improvementLabel: string;
};

/** Puntaje inicial → actual y la mejora (o desmejora) de la categoría que se
 * está viendo ampliada. */
export function ComparisonScoresBar({ scores }: { scores: ComparisonScores }) {
  const better = scores.improvement > 0;
  const worse = scores.improvement < 0;
  const Trend = worse ? TrendingDown : TrendingUp;
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <ScoreMini score={scores.initial} caption="Inicial" />
      <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
      <ScoreMini score={scores.current} caption="Actual" />
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
          better && "bg-emerald-50 text-emerald-700",
          worse && "bg-red-50 text-red-700",
          !better && !worse && "bg-muted text-muted-foreground",
        )}
      >
        <Trend className="size-4" aria-hidden />
        <span className="tabular-nums">
          {better ? "+" : ""}
          {scores.improvement}
        </span>
        <span className="font-medium">{scores.improvementLabel}</span>
      </span>
    </div>
  );
}
