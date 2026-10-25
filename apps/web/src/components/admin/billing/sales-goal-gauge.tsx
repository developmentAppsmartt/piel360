// Misma geometría que `analyses/risk-gauge.tsx`: semicírculo de 180°.
const CENTER = { x: 50, y: 50 };
const RADIUS = 40;

function point(angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: CENTER.x + RADIUS * Math.cos(rad),
    y: CENTER.y + RADIUS * Math.sin(rad),
  };
}

function arc(fromDeg: number, toDeg: number) {
  const a = point(fromDeg);
  const b = point(toDeg);
  return `M ${a.x} ${a.y} A ${RADIUS} ${RADIUS} 0 0 1 ${b.x} ${b.y}`;
}

/** Medidor de avance de una meta. Pasado el 100 % el arco queda lleno. */
export function SalesGoalGauge({
  percent,
  strokeClass,
}: {
  percent: number;
  strokeClass: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const angle = (clamped / 100) * 180;
  const needle = -90 + angle;

  return (
    <div className="relative w-36">
      <svg viewBox="0 0 100 58" className="w-full" aria-hidden>
        <path
          d={arc(0, 180)}
          className="stroke-muted"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
        />
        {clamped > 0 ? (
          <path
            d={arc(0, angle)}
            className={strokeClass}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
        <line
          x1={CENTER.x}
          y1={CENTER.y}
          x2={CENTER.x}
          y2={CENTER.y - RADIUS + 14}
          className="stroke-foreground"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            transformOrigin: `${CENTER.x}px ${CENTER.y}px`,
            transform: `rotate(${needle}deg)`,
          }}
        />
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r="3.5"
          className="fill-foreground"
        />
      </svg>
      <p className="-mt-1 text-center text-lg font-bold tabular-nums text-foreground">
        {percent}%
      </p>
    </div>
  );
}
