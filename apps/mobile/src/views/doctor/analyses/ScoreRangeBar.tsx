import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import type { RangosPuntaje } from '../../../data/youcamScoreConfig';
import type { YoucamScoreBand } from '../../../types/analysis';

/** Mismos tonos que el CRM (`report-score-bar`). */
export const SCORE_BAND_COLOR: Record<YoucamScoreBand, string> = {
  regular: '#F59E0B',
  promedio: '#3B82F6',
  buena: '#22C55E',
};

const TICKS = [0, 20, 40, 60, 80, 100];

type ScoreRangeBarProps = {
  score: number;
  ranges: RangosPuntaje;
  /** Sin rótulos de nivel: cabe en la tarjeta de cada métrica. */
  compact?: boolean;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

/**
 * Barra Regular / Promedio / Buena con límites de personalización,
 * marca del puntaje arriba y numeración 0–100 abajo (como el CRM).
 */
export function ScoreRangeBar({
  score,
  ranges,
  compact = false,
}: ScoreRangeBarProps) {
  const value = clamp(score);
  const regular = clamp(ranges.regularMax);
  const promedio = Math.max(0, clamp(ranges.promedioMax) - regular);
  const buena = Math.max(0, 100 - regular - promedio);
  const segments: { band: YoucamScoreBand; width: number; label: string }[] = [
    { band: 'regular', width: regular, label: 'Regular' },
    { band: 'promedio', width: promedio, label: 'Promedio' },
    { band: 'buena', width: buena, label: 'Buena' },
  ];
  const markerLeft = `${value}%` as DimensionValue;

  return (
    <View style={styles.block}>
      <View style={styles.markerRow}>
        <View style={[styles.marker, { left: markerLeft }]}>
          <Text style={styles.markerText}>{Math.round(value)}</Text>
          <View style={styles.markerTip} />
        </View>
      </View>

      <View style={[styles.track, compact && styles.trackCompact]}>
        {segments.map((s) =>
          s.width > 0 ? (
            <View
              key={s.band}
              style={{
                flex: s.width,
                backgroundColor: SCORE_BAND_COLOR[s.band],
              }}
            />
          ) : null,
        )}
      </View>

      <View style={styles.ticks}>
        {TICKS.map((tick) => (
          <Text
            key={tick}
            style={[
              styles.tick,
              tick === 0
                ? styles.tickStart
                : tick === 100
                  ? styles.tickEnd
                  : { left: `${tick}%` as DimensionValue },
            ]}
          >
            {tick}
          </Text>
        ))}
      </View>

      {compact ? null : (
        <View style={styles.labels}>
          {segments.map((s) =>
            s.width > 0 ? (
              <Text
                key={s.band}
                style={[
                  styles.label,
                  {
                    flex: s.width,
                    color: SCORE_BAND_COLOR[s.band],
                  },
                ]}
                numberOfLines={1}
              >
                {s.label}
              </Text>
            ) : null,
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 4,
  },
  markerRow: {
    height: 26,
    position: 'relative',
  },
  marker: {
    position: 'absolute',
    top: 0,
    marginLeft: -14,
    alignItems: 'center',
    zIndex: 1,
  },
  markerText: {
    minWidth: 28,
    textAlign: 'center',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  markerTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0F172A',
  },
  track: {
    height: 12,
    borderRadius: 999,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  trackCompact: {
    height: 8,
  },
  ticks: {
    height: 16,
    position: 'relative',
  },
  tick: {
    position: 'absolute',
    top: 0,
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: -8,
  },
  tickStart: {
    left: 0,
    marginLeft: 0,
  },
  tickEnd: {
    right: 0,
    left: undefined,
    marginLeft: 0,
  },
  labels: {
    flexDirection: 'row',
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
