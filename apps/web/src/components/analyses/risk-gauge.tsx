// Medidor semicircular — mismo criterio que create-analysis.blade.php: la
// aguja rota de -90° (0%) a +90° (100%) según `high_risk_prob`.
const CENTER = { x: 50, y: 55 };
const RADIUS = 40;

function polarToCartesian(angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: CENTER.x + RADIUS * Math.cos(rad),
    y: CENTER.y + RADIUS * Math.sin(rad),
  };
}

function arcPath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`;
}

export function RiskGauge({ percent, riskLabel }: { percent: number; riskLabel: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const rotation = -90 + (clamped / 100) * 180;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 70" className="w-full max-w-xs">
        <path d={arcPath(0, 60)} stroke="#22c55e" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d={arcPath(60, 120)} stroke="#facc15" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d={arcPath(120, 180)} stroke="#ef4444" strokeWidth="8" fill="none" strokeLinecap="round" />
        <line
          x1={CENTER.x}
          y1={CENTER.y}
          x2={CENTER.x}
          y2={CENTER.y - RADIUS + 6}
          stroke="currentColor"
          strokeWidth="2"
          style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px`, transform: `rotate(${rotation}deg)` }}
        />
        <circle cx={CENTER.x} cy={CENTER.y} r="3" fill="currentColor" />
      </svg>
      <p className="text-sm font-medium">
        Riesgo: <span className="font-semibold">{riskLabel}</span>
      </p>
    </div>
  );
}
