import { Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import Svg, {
  Circle,
  G,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type {
  SkiniverAgeGenderRow,
  SkiniverTopDiagnosis,
  SkinReportCategory,
  SkinReportDistributionSlice,
  SkinReportTrendPoint,
} from '../../../../types/skin-report';
import { skinReportScoreColor } from '../../../../types/skin-report';
import { useBranding } from '../../../../context/BrandingContext';

export type DonutSlice = {
  key: string;
  label: string;
  color: string;
  count: number;
  pct: number;
};

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
  return (
    <DistributionDonut
      slices={slices.map((s) => ({ ...s, key: s.band }))}
      total={total}
      size={size}
      centerHint="Análisis"
    />
  );
}

/** Dona genérica con leyenda (categorías, tonos de piel, bandas). */
export function DistributionDonut({
  slices,
  total,
  size = 160,
  centerHint,
}: {
  slices: DonutSlice[];
  total: number;
  size?: number;
  centerHint: string;
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
              key={arc.key}
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
          <Text style={donutStyles.centerHint}>{centerHint}</Text>
        </View>
      </View>
      <View style={donutStyles.legend}>
        {slices.map((slice) => (
          <View key={slice.key} style={donutStyles.legendRow}>
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
  primaryColor: primaryColorProp,
  emptyMessage = 'No hay análisis en el periodo seleccionado.',
}: {
  points: SkinReportTrendPoint[];
  primaryColor?: string;
  emptyMessage?: string;
}) {
  const branding = useBranding();
  const primaryColor = primaryColorProp ?? branding.colors.primary;
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
        p.avgScore == null ? null : (
          <SvgText
            key={`val-${p.period}`}
            x={toX(i)}
            y={toY(p.avgScore) - 8}
            fontSize={10}
            fontWeight="700"
            fill={primaryColor}
            textAnchor="middle"
          >
            {Math.round(p.avgScore)}
          </SvgText>
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

function TrendLabel({ delta }: { delta: number | null }) {
  if (delta == null) {
    return <Text style={[topStyles.trend, { color: '#9CA3AF' }]}>— sin evolución</Text>;
  }
  const flat = Math.abs(delta) < 0.5;
  const improved = delta > 0;
  const color = flat ? '#6B7280' : improved ? '#059669' : '#DC2626';
  const arrow = flat ? '–' : improved ? '↑' : '↓';
  return (
    <Text style={[topStyles.trend, { color }]}>
      {arrow} {delta > 0 ? '+' : ''}
      {delta.toFixed(1)}
    </Text>
  );
}

/** Top problemas: paridad con la tabla del CRM (color por banda de puntaje). */
export function TopProblemsList({ categories }: { categories: SkinReportCategory[] }) {
  if (categories.length === 0) {
    return (
      <Text style={barStyles.empty}>Sin categorías con datos en el periodo.</Text>
    );
  }
  return (
    <View style={topStyles.list}>
      {categories.map((category, index) => {
        const score = category.avgScore ?? 0;
        return (
          <View key={category.key} style={topStyles.row}>
            <View style={topStyles.mainLine}>
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
                      backgroundColor: skinReportScoreColor(score),
                    },
                  ]}
                />
              </View>
              <Text style={barStyles.score}>{score.toFixed(0)}</Text>
            </View>
            <View style={topStyles.metaLine}>
              <Text style={topStyles.affected}>
                <Text style={topStyles.affectedPct}>
                  {category.affectedPct.toFixed(0)}%
                </Text>{' '}
                afectados ({category.patientsAffected}/{category.patients})
              </Text>
              <TrendLabel delta={category.trendDelta} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Barras genéricas para segmentos lifestyle / clínicas. */
export function SegmentBars({
  segments,
  valueKey = 'avgScore',
  barColor: barColorProp,
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
  const branding = useBranding();
  const barColor = barColorProp ?? branding.colors.primary;
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

/** Tabla "Top 10 de diagnósticos más recurrentes" (paridad CRM TopDiagnosesTable). */
export function TopDiagnosesTable({ rows }: { rows: SkiniverTopDiagnosis[] }) {
  if (rows.length === 0) {
    return (
      <Text style={trendStyles.empty}>
        No hay diagnósticos en el periodo seleccionado.
      </Text>
    );
  }
  return (
    <View>
      <View style={[tableStyles.row, tableStyles.headRow]}>
        <Text style={[tableStyles.index, tableStyles.head]}>#</Text>
        <Text style={[tableStyles.name, tableStyles.head]}>Diagnóstico</Text>
        <Text style={[tableStyles.code, tableStyles.head]}>CIE-10</Text>
        <Text style={[tableStyles.count, tableStyles.head]}>Cant.</Text>
        <Text style={[tableStyles.pct, tableStyles.head]}>%</Text>
      </View>
      {rows.map((row, index) => (
        <View
          key={row.diagnosis}
          style={[
            tableStyles.row,
            index < rows.length - 1 && tableStyles.rowDivider,
          ]}
        >
          <Text style={tableStyles.index}>{index + 1}</Text>
          <Text style={tableStyles.name}>{row.diagnosis}</Text>
          <Text style={tableStyles.code}>{row.icdCode ?? '—'}</Text>
          <Text style={[tableStyles.count, tableStyles.countValue]}>
            {row.count}
          </Text>
          <Text style={tableStyles.pct}>{row.pct.toFixed(1)}%</Text>
        </View>
      ))}
    </View>
  );
}

const AGE_GENDER_SERIES = [
  { key: 'male', label: 'Hombres', color: '#3b82f6' },
  { key: 'female', label: 'Mujeres', color: '#14b8a6' },
  { key: 'unknown', label: 'Sin género', color: '#cbd5e1' },
] as const;

/** Barras agrupadas por rango de edad y sexo (paridad CRM AgeGenderBars). */
export function AgeGenderBars({ rows }: { rows: SkiniverAgeGenderRow[] }) {
  const { width: screenW } = useWindowDimensions();
  const hasAny = rows.some((r) => r.male + r.female + r.unknown > 0);
  if (!hasAny) {
    return (
      <Text style={trendStyles.empty}>
        Requiere la fecha de nacimiento y el género del paciente. Complétalos en
        la ficha del paciente para ver este reporte.
      </Text>
    );
  }

  // "Sin género" solo si tiene datos: una barra gris sola se lee como un
  // tercer sexo.
  const series = AGE_GENDER_SERIES.filter(
    (s) => s.key !== 'unknown' || rows.some((r) => r.unknown > 0),
  );

  const w = Math.max(300, screenW - 64);
  const h = 180;
  const padX = 28;
  const padY = 14;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;
  const rawMax = Math.max(
    1,
    ...rows.flatMap((r) => series.map((s) => r[s.key])),
  );
  const magnitude = 10 ** Math.floor(Math.log10(rawMax));
  const step = magnitude / 2 || 0.5;
  const yMax = Math.max(step, Math.ceil(rawMax / step) * step);
  const groupW = plotW / rows.length;
  const barW = Math.min(14, (groupW * 0.7) / series.length);
  const ticks = [0, yMax / 2, yMax];
  const toY = (value: number) => padY + (1 - value / yMax) * plotH;

  return (
    <View style={{ gap: 10 }}>
      <View style={multiStyles.legend}>
        {series.map((s) => (
          <View key={s.key} style={multiStyles.legendItem}>
            <View style={[multiStyles.swatch, { backgroundColor: s.color }]} />
            <Text style={multiStyles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
      <Svg width={w} height={h + 22} viewBox={`0 0 ${w} ${h + 22}`}>
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
        {rows.map((row, groupIndex) => {
          const groupCenter = padX + groupIndex * groupW + groupW / 2;
          const barsW = barW * series.length + 2 * (series.length - 1);
          const firstX = groupCenter - barsW / 2;
          return (
            <G key={row.key}>
              {series.map((s, i) => {
                const y = toY(row[s.key]);
                return (
                  <Rect
                    key={s.key}
                    x={firstX + i * (barW + 2)}
                    y={y}
                    width={barW}
                    height={Math.max(0, padY + plotH - y)}
                    fill={s.color}
                    rx={2}
                  />
                );
              })}
              <SvgText
                x={groupCenter}
                y={h + 14}
                fontSize={9}
                fill="#9CA3AF"
                textAnchor="middle"
              >
                {row.key}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/** Barras horizontales de conteo por rango de edad (paridad CRM AgeDistributionBars). */
export function AgeDistributionBars({ slices }: { slices: DonutSlice[] }) {
  const max = Math.max(...slices.map((s) => s.count), 0);
  if (max === 0) {
    return (
      <Text style={trendStyles.empty}>
        Requiere la fecha de nacimiento del paciente. Complétala en la ficha del
        paciente para ver este reporte.
      </Text>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {slices.map((slice) => (
        <View key={slice.key} style={ageStyles.row}>
          <Text style={ageStyles.label}>{slice.label}</Text>
          <View style={ageStyles.track}>
            <View
              style={[
                ageStyles.fill,
                {
                  // Mínimo visible para que un rango con datos no parezca vacío.
                  width: `${Math.max(3, (slice.count / max) * 100)}%`,
                  backgroundColor: slice.color,
                },
              ]}
            />
          </View>
          <Text style={ageStyles.value}>
            <Text style={ageStyles.valueStrong}>{slice.count}</Text>
            <Text style={ageStyles.valuePct}> ({slice.pct.toFixed(1)}%)</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

const tableStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 6,
  },
  headRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 6,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  head: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  index: {
    width: 18,
    fontSize: 12,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
  name: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '600' },
  code: {
    width: 48,
    fontSize: 12,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
  count: {
    width: 38,
    textAlign: 'right',
    fontSize: 12,
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  countValue: { fontWeight: '700', fontSize: 13 },
  pct: {
    width: 44,
    textAlign: 'right',
    fontSize: 12,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
});

const ageStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 84, fontSize: 12, color: '#6B7280' },
  track: {
    flex: 1,
    height: 16,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 6 },
  value: { width: 78, textAlign: 'right', fontVariant: ['tabular-nums'] },
  valueStrong: { fontSize: 13, fontWeight: '700', color: '#111827' },
  valuePct: { fontSize: 11, color: '#6B7280' },
});

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

const topStyles = StyleSheet.create({
  list: { gap: 2 },
  row: {
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    gap: 3,
  },
  mainLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 24,
  },
  affected: {
    fontSize: 11,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
  affectedPct: {
    fontWeight: '700',
    color: '#374151',
  },
  trend: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
