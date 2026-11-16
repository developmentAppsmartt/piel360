import { cn } from "@/lib/utils";

/** Anillo de puntaje «84 / 100». `color` es el de la banda del puntaje. */
export function ScoreRing({
  score,
  color,
  size = 112,
  className,
}: {
  score: number;
  color: string;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const r = 42;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Puntaje ${Math.round(score)} de 100`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-extrabold text-foreground" style={{ fontSize: size * 0.3 }}>
          {Math.round(score)}
        </span>
        <span className="text-muted-foreground" style={{ fontSize: size * 0.12 }}>
          /100
        </span>
      </div>
    </div>
  );
}
