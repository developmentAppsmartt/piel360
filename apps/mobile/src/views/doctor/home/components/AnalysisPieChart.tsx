import { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

type AnalysisPieChartProps = {
  slices: PieSlice[];
  size?: number;
  primaryColor?: string;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function slicePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

/** Gráfica de torta (donut) para métricas de análisis del doctor. */
export function AnalysisPieChart({
  slices,
  size = 180,
  primaryColor = '#0B4F8A',
}: AnalysisPieChartProps) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.24;

  const arcs = useMemo(() => {
    if (total <= 0) return [];
    let angle = 0;
    return slices
      .filter((s) => s.value > 0)
      .map((s) => {
        const sweep = (s.value / total) * 360;
        const start = angle;
        const end = angle + sweep;
        angle = end;
        return {
          ...s,
          start,
          end: sweep >= 359.99 ? start + 359.99 : end,
          percent: Math.round((s.value / total) * 100),
        };
      });
  }, [slices, total]);

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size, alignSelf: 'center' }}>
        <Svg width={size} height={size}>
          {total <= 0 ? (
            <Circle
              cx={cx}
              cy={cy}
              r={outerR}
              fill="#E8EEF4"
              stroke="#D0DAE6"
              strokeWidth={1}
            />
          ) : (
            <G>
              {arcs.map((arc) => (
                <Path
                  key={arc.label}
                  d={slicePath(cx, cy, outerR, arc.start, arc.end)}
                  fill={arc.color}
                />
              ))}
              <Circle cx={cx} cy={cy} r={innerR} fill="#FFFFFF" />
            </G>
          )}
        </Svg>
        <View style={[styles.centerLabel, { pointerEvents: 'none' }]}>
          <Text style={[styles.centerValue, { color: primaryColor }]}>
            {total}
          </Text>
          <Text style={styles.centerHint}>análisis</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <View key={s.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.legendLabel}>{s.label}</Text>
              <Text style={styles.legendValue}>
                {s.value} · {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  centerHint: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  legend: {
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    fontVariant: ['tabular-nums'],
  },
});
