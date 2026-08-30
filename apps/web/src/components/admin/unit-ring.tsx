import { cn } from "@/lib/utils";

export function UnitRing({
  percent,
  label,
  className,
  trackClassName,
  progressClassName,
  decimals = 0,
  display = "percent",
}: {
  percent: number;
  label?: string;
  className?: string;
  trackClassName?: string;
  progressClassName?: string;
  decimals?: number;
  display?: "percent" | "fraction";
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = c - (clamped / 100) * c;
  const compact = className?.includes("size-16");

  return (
    <div className={cn("relative size-24 shrink-0", className)}>
      <svg viewBox="0 0 88 88" className="size-full -rotate-90">
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="8"
          className={cn("stroke-muted", trackClassName)}
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn("stroke-primary transition-all", progressClassName)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {display === "fraction" ? (
          <>
            <span
              className={cn(
                "font-bold tabular-nums",
                compact ? "text-sm" : "text-xl",
              )}
            >
              {Math.round(clamped)}
            </span>
            <span
              className={cn(
                "mt-0.5 text-muted-foreground tabular-nums",
                compact ? "text-[8px]" : "text-[10px]",
              )}
            >
              /100
            </span>
          </>
        ) : (
          <>
            <span className="text-sm font-bold tabular-nums">
              {clamped.toFixed(decimals)}%
            </span>
            {label ? (
              <span className="text-[10px] text-muted-foreground">{label}</span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
