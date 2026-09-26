import { Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import type {
  SkinReportCategory,
  SkinReportDistributionSlice,
  SkinReportTrendPoint,
} from '../../../types/skin-report';

/** Dona de bandas de puntaje (paridad CRM ScoreDistributionDonut). */
export function ScoreDistributionDonut({
  slices,
  total,
  size = 160,
}: {
  slices: SkinReportDistributionSlice[];
  total: number;
  size?: number;
}) {
  const r = 60;
  const c = 2 * Math.PI * r;
  const stroke = 20;
  let consumed = 0;
  const arcs = slices
    .filter((s) => s.count > 0)
    .map((slice) => {
      const fraction = total > 0 ? slice.count / total : 0;
      const arc = {
        ...slice,
        dash: `${fraction * c} ${c - fraction * c}`,
        offset: -consumed * c,
      };
      consumed += fraction;
      return arc;
    });

  return (
    <View style={donutStyles.wrap}>
      <View style={[donutStyles.chartBox, { width: size, height: size }]}>
        <Svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          style={StyleSheet.absoluteFill}
        >
          <Circle
            cx={80}
            cy={80}
            r={r}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={stroke}
            rotation={-90}
            origin="80, 80"
          />
          {arcs.map((arc) => (
            <Circle
              key={arc.band}
              cx={80}
              cy={80}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeDasharray={arc.dash}
              strokeDashoffset={arc.offset}
              rotation={-90}
              origin="80, 80"
              strokeLinecap="butt"
            />
          ))}
        </Svg>
        <View style={donutStyles.center} pointerEvents="none">
          <Text style={donutStyles.centerValue}>
            {total.toLocaleString('es-CO')}
          </Text>
          <Text style={donutStyles.centerHint}>Análisis</Text>
        </View>
      </View>
      <View style={donutStyles.legend}>
        {slices.map((slice) => (
          <View key={slice.band} style={donutStyles.legendRow}>
            <View
              style={[donutStyles.dot, { backgroundColor: slice.color }]}
            />
            <Text style={donutStyles.legendLabel}>{slice.label}</Text>
            <Text style={donutStyles.legendCount}>{slice.count}</Text>
            <Text style={donutStyles.legendPct}>{slice.pct.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Línea de evolución 0–100 (paridad CRM ScoreTrendChart). */
export function ScoreTrendChart({
  points,
  primaryColor = '#1E5A9E',
  emptyMessage = 'No hay análisis en el periodo seleccionado.',
}: {
  points: SkinReportTrendPoint[];
  primaryColor?: string;
  emptyMessage?: string;
}) {
  const { width: screenW } = useWindowDimensions();
  const w = Math.max(320, screenW - 64);
  const h = 180;
  const padX = 28;
  const padY = 20;
  const withData = points.filter((p) => p.avgScore != null);
  if (withData.length === 0) {
    return <Text style={trendStyles.empty}>{emptyMessage}</Text>;
  }

  const yMin = 0;
  const yMax = 100;
  const toX = (i: number) =>
    padX +
    (points.length <= 1 ? 0 : (i / (points.length - 1)) * (w - padX * 2));
  const toY = (v: number) =>
    padY + (1 - (v - yMin) / (yMax - yMin)) * (h - padY * 2);

  const segments: { i: number; value: number }[][] = [];
  let current: { i: number; value: number }[] = [];
  points.forEach((p, i) => {
    if (p.avgScore == null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ i, value: p.avgScore });
  });
  if (current.length) segments.push(current);

  const ticks = [0, 25, 50, 75, 100];
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <Svg width={w} height={h + 24} viewBox={`0 0 ${w} ${h + 24}`}>
      {ticks.map((t) => (
        <Line
          key={t}
          x1={padX}
          x2={w - padX}
          y1={toY(t)}
          y2={toY(t)}
          stroke="#E5E7EB"
          strokeDasharray="4 4"
        />
      ))}
      {ticks.map((t) => (
        <SvgText
          key={`lbl-${t}`}
          x={padX - 6}
          y={toY(t) + 3}
          fontSize={9}
          fill="#9CA3AF"
          textAnchor="end"
        >
          {t}
        </SvgText>
      ))}
      {segments.map((segment) => (
        <Polyline
          key={`seg-${segment[0].i}`}
          fill="none"
          stroke={primaryColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={segment.map((p) => `${toX(p.i)},${toY(p.value)}`).join(' ')}
        />
      ))}
      {points.map((p, i) =>
        p.avgScore == null ? null : (
          <Circle
            key={`pt-${p.period}`}
            cx={toX(i)}
            cy={toY(p.avgScore)}
            r={3.5}
            fill={primaryColor}
          />
        ),
      )}
      {points.map((p, i) =>
        i % labelStep === 0 || i === points.length - 1 ? (
          <SvgText
            key={`x-${p.period}`}
            x={toX(i)}
            y={h + 16}
            fontSize={9}
            fill="#9CA3AF"
            textAnchor="middle"
          >
            {p.period.slice(5)}
          </SvgText>
        ) : null,
      )}
    </Svg>
  );
}

/** Barras horizontales de ranking (paridad CRM CategoryRankingBars). */
export function CategoryRankingBars({
  categories,
  variant,
  selectedKey,
  onSelect,
}: {
  categories: SkinReportCategory[];
  variant: 'needs' | 'strengths';
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}) {
  if (categories.length === 0) {
    return (
      <Text style={barStyles.empty}>Sin categorías con datos en el periodo.</Text>
    );
  }
  const color = variant === 'needs' ? '#ef4444' : '#22c55e';

  return (
    <View style={barStyles.list}>
      {categories.map((category, index) => {
        const score = category.avgScore ?? 0;
        const active = selectedKey === category.key;
        return (
          <Pressable
            key={category.key}
            onPress={() => onSelect?.(category.key)}
            disabled={!onSelect}
            style={[barStyles.row, active && barStyles.rowActive]}
          >
            <Text style={barStyles.index}>{index + 1}</Text>
            <Text style={barStyles.label} numberOfLines={1}>
              {category.label}
            </Text>
            <View style={barStyles.track}>
              <View
                style={[
                  barStyles.fill,
                  {
                    width: `${Math.max(0, Math.min(100, score))}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
            <Text style={barStyles.score}>{score.toFixed(0)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Barras genéricas para segmentos lifestyle / clínicas. */
export function SegmentBars({
  segments,
  valueKey = 'avgScore',
  barColor = '#1E5A9E',
}: {
  segments: {
    key: string;
    label: string;
    patients: number;
    pct: number;
    avgScore: number | null;
  }[];
  valueKey?: 'avgScore' | 'pct' | 'patients';
  barColor?: string;
}) {
  if (segments.length === 0) {
    return <Text style={barStyles.empty}>Sin datos en el periodo.</Text>;
  }
  const max =
    valueKey === 'avgScore'
      ? 100
      : Math.max(
          1,
          ...segments.map((s) =>
            valueKey === 'pct' ? s.pct : s.patients,
          ),
        );

  return (
    <View style={barStyles.list}>
      {segments.map((seg, index) => {
        const raw =
          valueKey === 'avgScore'
            ? (seg.avgScore ?? 0)
            : valueKey === 'pct'
              ? seg.pct
              : seg.patients;
        const widthPct =
          valueKey === 'avgScore'
            ? Math.max(0, Math.min(100, raw))
            : Math.max(4, (raw / max) * 100);
        const valueLabel =
          valueKey === 'avgScore'
            ? seg.avgScore != null
              ? seg.avgScore.toFixed(0)
              : '—'
            : valueKey === 'pct'
              ? `${seg.pct.toFixed(0)}%`
              : String(seg.patients);
        return (
          <View key={seg.key} style={barStyles.row}>
            <Text style={barStyles.index}>{index + 1}</Text>
            <Text style={barStyles.label} numberOfLines={1}>
              {seg.label}
            </Text>
            <View style={barStyles.track}>
              <View
                style={[
                  barStyles.fill,
                  { width: `${widthPct}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <Text style={barStyles.score}>{valueLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}

export type MultiSeriesDef = {
  key: string;
  label: string;
  color: string;
};

/** Varias series mensuales (reporte dermatológico Skiniver). */
export function MultiSeriesTrendChart({
  points,
  series,
  emptyMessage = 'No hay diagnósticos en el periodo seleccionado.',
}: {
  points: { period: string; counts: Record<string, number> }[];
  series: MultiSeriesDef[];
  emptyMessage?: string;
}) {
  const { width: screenW } = useWindowDimensions();
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const w = Math.max(320, screenW - 64);
  const h = 180;
  const padX = 28;
  const padY = 16;

  const visible = series.filter((s) => !hidden.has(s.key));
  const hasAny = points.some((p) =>
    series.some((s) => (p.counts[s.key] ?? 0) > 0),
  );

  if (!hasAny) {
    return <Text style={trendStyles.empty}>{emptyMessage}</Text>;
  }

  const maxValue = Math.max(
    1,
    ...points.flatMap((p) => visible.map((s) => p.counts[s.key] ?? 0)),
  );
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  const yMax = Math.ceil(maxValue / (magnitude / 2)) * (magnitude / 2) || 1;
  const toX = (i: number) =>
    padX +
    (points.length <= 1 ? 0 : (i / (points.length - 1)) * (w - padX * 2));
  const toY = (v: number) => padY + (1 - v / yMax) * (h - padY * 2);
  const ticks = [0, yMax / 2, yMax];
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <View style={{ gap: 10 }}>
      <Svg width={w} height={h + 24} viewBox={`0 0 ${w} ${h + 24}`}>
        {ticks.map((t) => (
          <Line
            key={t}
            x1={padX}
            x2={w - padX}
            y1={toY(t)}
            y2={toY(t)}
            stroke="#E5E7EB"
            strokeDasharray="4 4"
          />
        ))}
        {ticks.map((t) => (
          <SvgText
            key={`lbl-${t}`}
            x={padX - 6}
            y={toY(t) + 3}
            fontSize={9}
            fill="#9CA3AF"
            textAnchor="end"
          >
            {Math.round(t)}
          </SvgText>
        ))}
        {visible.map((s) => {
          const pts = points
            .map((p, i) => `${toX(i)},${toY(p.counts[s.key] ?? 0)}`)
            .join(' ');
          return (
            <Polyline
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pts}
            />
          );
        })}
        {points.map((p, i) =>
          i % labelStep === 0 || i === points.length - 1 ? (
            <SvgText
              key={`x-${p.period}`}
              x={toX(i)}
              y={h + 16}
              fontSize={9}
              fill="#9CA3AF"
              textAnchor="middle"
            >
              {p.period.slice(5)}
            </SvgText>
          ) : null,
        )}
      </Svg>
      <View style={multiStyles.legend}>
        {series.map((s) => {
          const off = hidden.has(s.key);
          return (
            <Pressable
              key={s.key}
              onPress={() => {
                setHidden((prev) => {
                  const next = new Set(prev);
                  if (next.has(s.key)) next.delete(s.key);
                  else next.add(s.key);
                  return next;
                });
              }}
              style={[multiStyles.legendItem, off && { opacity: 0.35 }]}
            >
              <View
                style={[multiStyles.swatch, { backgroundColor: s.color }]}
              />
              <Text style={multiStyles.legendText} numberOfLines={1}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const multiStyles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '48%',
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    flexShrink: 1,
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
});

const donutStyles = StyleSheet.create({
  wrap: { gap: 14, alignItems: 'center' },
  chartBox: {
    alignSelf: 'center',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  centerValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 26,
    textAlign: 'center',
  },
  centerHint: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  legend: { gap: 8, width: '100%' },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
  legendCount: { fontSize: 12, color: '#6B7280', minWidth: 28, textAlign: 'right' },
  legendPct: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    minWidth: 40,
    textAlign: 'right',
  },
});

const trendStyles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    paddingVertical: 24,
  },
});

const barStyles = StyleSheet.create({
  list: { gap: 4 },
  empty: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  rowActive: {
    backgroundColor: '#EFF6FF',
  },
  index: {
    width: 16,
    fontSize: 11,
    color: '#9CA3AF',
    fontVariant: ['tabular-nums'],
  },
  label: {
    width: 120,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  score: {
    width: 28,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
});
